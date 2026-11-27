"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { calculateFinancials, ghsToPesewas } from "@/lib/money";
import { createRaffleSchema } from "@/lib/validations";

export interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function createRaffleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await assertAdminSession();
    const parsed = createRaffleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const v = parsed.data;
    const financials = calculateFinancials({
      entryFeePesewas: ghsToPesewas(v.entryFeeGhs),
      participantCapacity: v.participantCapacity,
      ownerProfitPesewas: ghsToPesewas(v.ownerProfitGhs),
      allocationMethod: v.allocationMethod,
      firstPrizePesewas:
        v.firstPrizeGhs !== undefined ? ghsToPesewas(v.firstPrizeGhs) : undefined,
      secondPrizePesewas:
        v.secondPrizeGhs !== undefined ? ghsToPesewas(v.secondPrizeGhs) : undefined,
      thirdPrizePesewas:
        v.thirdPrizeGhs !== undefined ? ghsToPesewas(v.thirdPrizeGhs) : undefined,
    });

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("raffle_rounds")
      .insert({
        round_code: v.roundCode,
        name: v.name,
        description: v.description || null,
        entry_fee_pesewas: financials.entryFeePesewas,
        participant_capacity: financials.participantCapacity,
        gross_revenue_pesewas: financials.grossRevenuePesewas,
        owner_profit_pesewas: financials.ownerProfitPesewas,
        prize_pool_pesewas: financials.prizePoolPesewas,
        allocation_method: financials.allocationMethod,
        first_prize_pesewas: financials.firstPrizePesewas,
        second_prize_pesewas: financials.secondPrizePesewas,
        third_prize_pesewas: financials.thirdPrizePesewas,
        momo_instructions: v.momoInstructions || null,
        cover_image_url: v.coverImageUrl || null,
        opens_at: v.opensAt || null,
        closes_at: v.closesAt || null,
        status: "draft",
        created_by: admin.id,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_CREATED",
      target_type: "raffle_round",
      target_id: data.id,
      new_value: { round_code: v.roundCode, name: v.name, ...financials },
    });

    revalidatePath("/admin/raffles");
    revalidatePath("/raffles");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create raffle" };
  }
}

export async function updateDraftRaffleAction(
  roundId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const parsed = createRaffleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const supabase = createAdminSupabaseClient();
    const { data: existing } = await supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (!existing) return { ok: false, error: "Raffle not found" };
    if (existing.status !== "draft") {
      return { ok: false, error: "Only draft raffles can be edited" };
    }

    const v = parsed.data;
    const financials = calculateFinancials({
      entryFeePesewas: ghsToPesewas(v.entryFeeGhs),
      participantCapacity: v.participantCapacity,
      ownerProfitPesewas: ghsToPesewas(v.ownerProfitGhs),
      allocationMethod: v.allocationMethod,
      firstPrizePesewas:
        v.firstPrizeGhs !== undefined ? ghsToPesewas(v.firstPrizeGhs) : undefined,
      secondPrizePesewas:
        v.secondPrizeGhs !== undefined ? ghsToPesewas(v.secondPrizeGhs) : undefined,
      thirdPrizePesewas:
        v.thirdPrizeGhs !== undefined ? ghsToPesewas(v.thirdPrizeGhs) : undefined,
    });

    const { error } = await supabase
      .from("raffle_rounds")
      .update({
        round_code: v.roundCode,
        name: v.name,
        description: v.description || null,
        entry_fee_pesewas: financials.entryFeePesewas,
        participant_capacity: financials.participantCapacity,
        gross_revenue_pesewas: financials.grossRevenuePesewas,
        owner_profit_pesewas: financials.ownerProfitPesewas,
        prize_pool_pesewas: financials.prizePoolPesewas,
        allocation_method: financials.allocationMethod,
        first_prize_pesewas: financials.firstPrizePesewas,
        second_prize_pesewas: financials.secondPrizePesewas,
        third_prize_pesewas: financials.thirdPrizePesewas,
        momo_instructions: v.momoInstructions || null,
        cover_image_url: v.coverImageUrl || null,
        opens_at: v.opensAt || null,
        closes_at: v.closesAt || null,
      })
      .eq("id", roundId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_DRAFT_UPDATED",
      target_type: "raffle_round",
      target_id: roundId,
      previous_value: { name: existing.name, entry_fee_pesewas: existing.entry_fee_pesewas },
      new_value: { name: v.name, ...financials },
    });

    revalidatePath("/admin/raffles");
    revalidatePath(`/admin/raffles/${roundId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update draft" };
  }
}

export async function publishRaffleAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { data: existing } = await supabase
      .from("raffle_rounds")
      .select("status")
      .eq("id", roundId)
      .single();

    if (!existing) return { ok: false, error: "Raffle not found" };
    if (existing.status !== "draft") {
      return { ok: false, error: "Only draft raffles can be published" };
    }

    const { error } = await supabase
      .from("raffle_rounds")
      .update({ status: "published" })
      .eq("id", roundId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_PUBLISHED",
      target_type: "raffle_round",
      target_id: roundId,
      previous_value: { status: "draft" },
      new_value: { status: "published" },
    });

    revalidatePath("/admin/raffles");
    revalidatePath("/raffles");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to publish" };
  }
}

export async function activateRaffleAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.rpc("activate_raffle_round", {
      p_round_id: roundId,
      p_admin_id: admin.id,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/raffles");
    revalidatePath(`/admin/raffles/${roundId}`);
    revalidatePath("/raffles");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to activate" };
  }
}

export async function deactivateRaffleAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.rpc("deactivate_raffle_round", {
      p_round_id: roundId,
      p_admin_id: admin.id,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/raffles");
    revalidatePath(`/admin/raffles/${roundId}`);
    revalidatePath("/raffles");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to deactivate" };
  }
}

export async function duplicateRaffleAction(sourceRoundId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { data: src } = await supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", sourceRoundId)
      .single();

    if (!src) return { ok: false, error: "Source raffle not found" };

    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${src.round_code}-${suffix}`.slice(0, 30);

    const { data, error } = await supabase
      .from("raffle_rounds")
      .insert({
        round_code: newCode,
        name: `${src.name} (Copy)`,
        description: src.description,
        entry_fee_pesewas: src.entry_fee_pesewas,
        participant_capacity: src.participant_capacity,
        gross_revenue_pesewas: src.gross_revenue_pesewas,
        owner_profit_pesewas: src.owner_profit_pesewas,
        prize_pool_pesewas: src.prize_pool_pesewas,
        allocation_method: src.allocation_method,
        first_prize_pesewas: src.first_prize_pesewas,
        second_prize_pesewas: src.second_prize_pesewas,
        third_prize_pesewas: src.third_prize_pesewas,
        momo_instructions: src.momo_instructions,
        cover_image_url: src.cover_image_url,
        status: "draft",
        created_by: admin.id,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_DUPLICATED",
      target_type: "raffle_round",
      target_id: data.id,
      new_value: { source_round_id: sourceRoundId, round_code: newCode },
    });

    revalidatePath("/admin/raffles");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to duplicate" };
  }
}

export async function archiveRaffleAction(roundId: string): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const supabase = createAdminSupabaseClient();

    const { data: existing } = await supabase
      .from("raffle_rounds")
      .select("status")
      .eq("id", roundId)
      .single();

    if (!existing) return { ok: false, error: "Raffle not found" };
    if (existing.status !== "completed") {
      return { ok: false, error: "Only completed raffles can be archived" };
    }

    const { error } = await supabase
      .from("raffle_rounds")
      .update({ status: "archived" })
      .eq("id", roundId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "RAFFLE_ARCHIVED",
      target_type: "raffle_round",
      target_id: roundId,
      previous_value: { status: "completed" },
      new_value: { status: "archived" },
    });

    revalidatePath("/admin/raffles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to archive" };
  }
}

