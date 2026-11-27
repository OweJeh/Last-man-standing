"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  decryptSeed,
  encryptSeed,
  generateDrawPlan,
  type PlannedStage,
  type PlannedWinner,
  type SnapshotParticipant,
} from "@/lib/raffle-engine";
import type { ActionResult } from "./admin-raffles";
import type { PayoutStatus } from "@/types/database";

function getEncryptionKey(): string {
  const key = process.env.RAFFLE_SEED_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("Server misconfiguration: RAFFLE_SEED_ENCRYPTION_KEY must be 64 hex chars");
  }
  return key;
}

export async function startRaffleDrawAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();
    const encryptionKey = getEncryptionKey();

    const { data: round } = await supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (!round) return { ok: false, error: "Raffle round not found" };
    if (round.status !== "full") {
      return {
        ok: false,
        error: `Raffle must be FULL before starting the draw (current status: ${round.status})`,
      };
    }

    // Verify no draw plan already exists
    const { data: existingPlan } = await supabase.rpc("get_draw_plan", {
      p_round_id: roundId,
    });

    if (existingPlan) {
      return { ok: false, error: "A draw plan has already been generated for this raffle" };
    }

    // Fetch all entries & verify payments are consumed
    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("id, user_id, display_name, assigned_number, payment_id, payment_submissions(status)")
      .eq("round_id", roundId);

    if (entriesError || !entries) {
      return { ok: false, error: entriesError?.message || "Failed to load entries" };
    }

    if (entries.length !== round.participant_capacity) {
      return {
        ok: false,
        error: `Expected ${round.participant_capacity} entries, found ${entries.length}`,
      };
    }

    for (const e of entries) {
      const paymentRel = e.payment_submissions as unknown as { status: string } | null;
      if (!paymentRel || paymentRel.status !== "consumed") {
        return { ok: false, error: `Entry #${e.assigned_number} does not have a consumed payment` };
      }
    }

    const snapshot: SnapshotParticipant[] = entries.map((e) => ({
      entryId: e.id,
      userId: e.user_id,
      displayName: e.display_name,
      assignedNumber: e.assigned_number,
    }));

    const plan = generateDrawPlan(snapshot);
    const encryptedSeed = encryptSeed(plan.seedHex, encryptionKey);

    // Persist private draw plan via service_role RPC
    const { error: planError } = await supabase.rpc("store_draw_plan", {
      p_round_id: roundId,
      p_encrypted_seed: encryptedSeed,
      p_seed_commitment: plan.seedCommitment,
      p_snapshot_hash: plan.snapshotHash,
      p_algorithm_version: plan.algorithmVersion,
      p_canonical_snapshot: plan.canonicalSnapshot,
      p_shuffled_order: plan.shuffledOrder,
      p_stage_plans: plan.stages,
      p_winners_plan: plan.winners,
      p_result_hash: plan.resultHash,
    });

    if (planError) return { ok: false, error: planError.message };

    // Insert 5 prepared stages
    const stageRows = plan.stages.map((s) => ({
      round_id: roundId,
      stage_number: s.stageNumber,
      stage_name: s.stageName,
      starting_count: s.startingCount,
      eliminate_count: s.eliminateCount,
      surviving_count: s.survivingCount,
      status: "prepared",
    }));

    const { error: stagesError } = await supabase.from("raffle_stages").insert(stageRows);
    if (stagesError) return { ok: false, error: stagesError.message };

    // Lock financials & start raffle
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("raffle_rounds")
      .update({
        status: "running",
        financials_frozen_at: round.financials_frozen_at || now,
        seed_commitment: plan.seedCommitment,
        snapshot_hash: plan.snapshotHash,
        algorithm_version: plan.algorithmVersion,
        started_at: now,
      })
      .eq("id", roundId);

    if (updateError) return { ok: false, error: updateError.message };

    // Broadcast DRAW_LOCKED event
    await supabase.from("raffle_events").insert({
      round_id: roundId,
      sequence_number: 1,
      event_type: "DRAW_LOCKED",
      payload: {
        seed_commitment: plan.seedCommitment,
        snapshot_hash: plan.snapshotHash,
        algorithm_version: plan.algorithmVersion,
        participant_count: snapshot.length,
      },
    });

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_DRAW_STARTED",
      target_type: "raffle_round",
      target_id: roundId,
      new_value: {
        seed_commitment: plan.seedCommitment,
        snapshot_hash: plan.snapshotHash,
        algorithm_version: plan.algorithmVersion,
      },
    });

    revalidatePath(`/admin/raffles/${roundId}/control`);
    revalidatePath(`/live/${roundId}`);
    revalidatePath("/raffles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to start draw" };
  }
}

export async function publishNextStageAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { data: round } = await supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (!round) return { ok: false, error: "Raffle round not found" };
    if (round.status !== "running") {
      return { ok: false, error: "Raffle is not currently running" };
    }

    const nextStage = round.current_stage + 1;
    if (nextStage < 1 || nextStage > 5) {
      return { ok: false, error: "All 5 stages have already been published" };
    }

    // Load private draw plan via service_role RPC
    const { data: drawPlanRaw, error: planErr } = await supabase.rpc("get_draw_plan", {
      p_round_id: roundId,
    });

    const drawPlan = drawPlanRaw as {
      encrypted_seed: string;
      stage_plans: PlannedStage[];
      winners_plan: PlannedWinner[];
      result_hash: string;
    } | null;

    if (planErr || !drawPlan) {
      return { ok: false, error: planErr?.message || "Private draw plan not found" };
    }

    const stagePlans = drawPlan.stage_plans as PlannedStage[];
    const stagePlan = stagePlans.find((s) => s.stageNumber === nextStage);
    if (!stagePlan) {
      return { ok: false, error: `Stage ${nextStage} plan missing` };
    }

    const now = new Date().toISOString();

    // Mark stage published
    await supabase
      .from("raffle_stages")
      .update({ status: "published", published_at: now })
      .eq("round_id", roundId)
      .eq("stage_number", nextStage);

    // Insert public stage result
    const { error: srError } = await supabase.from("stage_results").insert({
      round_id: roundId,
      stage_number: nextStage,
      eliminated_numbers: stagePlan.eliminatedNumbers,
      surviving_numbers: stagePlan.survivingNumbers,
      elimination_sequence: stagePlan.eliminationSequence,
      published_at: now,
    });

    if (srError) return { ok: false, error: srError.message };

    // Mark eliminated entries
    if (stagePlan.eliminatedEntryIds.length > 0) {
      await supabase
        .from("entries")
        .update({
          status: "eliminated",
          eliminated_stage: nextStage,
          eliminated_at: now,
        })
        .in("id", stagePlan.eliminatedEntryIds);
    }

    // Determine next sequence number
    const { data: lastEvent } = await supabase
      .from("raffle_events")
      .select("sequence_number")
      .eq("round_id", roundId)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = (lastEvent?.sequence_number ?? 0) + 1;

    await supabase.from("raffle_events").insert({
      round_id: roundId,
      sequence_number: seq,
      event_type: nextStage === 5 ? "FINAL_SIX_STARTED" : "STAGE_PUBLISHED",
      payload: {
        stage_number: nextStage,
        stage_name: stagePlan.stageName,
        announcement: stagePlan.announcement,
        eliminated_numbers: stagePlan.eliminatedNumbers,
        surviving_numbers: stagePlan.survivingNumbers,
        elimination_sequence: stagePlan.eliminationSequence,
        published_at: now,
      },
    });
    seq += 1;

    // If Stage 5 (Final Six), finalize winners and reveal cryptographic seed
    if (nextStage === 5) {
      const winnersPlan = drawPlan.winners_plan as PlannedWinner[];
      const prizeMap: Record<1 | 2 | 3, number> = {
        1: round.first_prize_pesewas,
        2: round.second_prize_pesewas,
        3: round.third_prize_pesewas,
      };

      const winnerRows = winnersPlan.map((w) => ({
        round_id: roundId,
        entry_id: w.entryId,
        user_id: w.userId,
        position: w.position,
        display_name: w.displayName,
        assigned_number: w.assignedNumber,
        prize_pesewas: prizeMap[w.position],
        payout_status: "pending",
      }));

      await supabase.from("winners").insert(winnerRows);
      await supabase
        .from("entries")
        .update({ status: "winner" })
        .in(
          "id",
          winnersPlan.map((w) => w.entryId)
        );

      const encryptionKey = getEncryptionKey();
      const revealedSeed = decryptSeed(drawPlan.encrypted_seed, encryptionKey);

      await supabase
        .from("raffle_rounds")
        .update({
          current_stage: 5,
          status: "completed",
          revealed_seed: revealedSeed,
          result_hash: drawPlan.result_hash,
          completed_at: now,
        })
        .eq("id", roundId);

      await supabase.from("raffle_events").insert({
        round_id: roundId,
        sequence_number: seq,
        event_type: "WINNERS_REVEALED",
        payload: {
          winners: winnerRows.map((w) => ({
            position: w.position,
            display_name: w.display_name,
            assigned_number: w.assigned_number,
            prize_pesewas: w.prize_pesewas,
          })),
          revealed_seed: revealedSeed,
          result_hash: drawPlan.result_hash,
        },
      });
    } else {
      await supabase
        .from("raffle_rounds")
        .update({ current_stage: nextStage })
        .eq("id", roundId);
    }

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "STAGE_PUBLISHED",
      target_type: "raffle_round",
      target_id: roundId,
      new_value: { stage_number: nextStage, surviving_count: stagePlan.survivingCount },
    });

    revalidatePath(`/admin/raffles/${roundId}/control`);
    revalidatePath(`/live/${roundId}`);
    revalidatePath("/winners");
    revalidatePath(`/winners/${roundId}`);
    revalidatePath(`/fairness/${roundId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to publish stage" };
  }
}

export async function updatePayoutStatusAction(
  winnerId: string,
  payoutStatus: PayoutStatus,
  payoutReference?: string
): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { data: existing } = await supabase
      .from("winners")
      .select("payout_status, round_id")
      .eq("id", winnerId)
      .single();

    if (!existing) return { ok: false, error: "Winner record not found" };

    const { error } = await supabase
      .from("winners")
      .update({
        payout_status: payoutStatus,
        payout_reference: payoutReference || null,
        paid_at: payoutStatus === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", winnerId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "WINNER_PAYOUT_UPDATED",
      target_type: "winner",
      target_id: winnerId,
      previous_value: { payout_status: existing.payout_status },
      new_value: { payout_status: payoutStatus, payout_reference: payoutReference || null },
    });

    revalidatePath("/admin/payouts");
    revalidatePath("/admin/winners");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update payout" };
  }
}

