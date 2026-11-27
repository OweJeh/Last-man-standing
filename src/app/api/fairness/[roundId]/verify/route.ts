import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyDraw, type SnapshotParticipant } from "@/lib/raffle-engine";

export async function POST(
  _req: Request,
  context: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await context.params;
  const supabase = createAdminSupabaseClient();

  const { data: round } = await supabase
    .from("raffle_rounds")
    .select("*")
    .eq("id", roundId)
    .in("status", ["completed", "archived"])
    .single();

  if (!round || !round.revealed_seed || !round.seed_commitment || !round.snapshot_hash || !round.result_hash || !round.algorithm_version) {
    return NextResponse.json(
      { error: "Completed round cryptographic proof not available" },
      { status: 400 }
    );
  }

  const { data: entries } = await supabase
    .from("entries")
    .select("id, user_id, display_name, assigned_number")
    .eq("round_id", roundId);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "Participant snapshot missing" }, { status: 400 });
  }

  const snapshot: SnapshotParticipant[] = entries.map((e) => ({
    entryId: e.id,
    userId: e.user_id,
    displayName: e.display_name,
    assignedNumber: e.assigned_number,
  }));

  const verification = verifyDraw({
    seedHex: round.revealed_seed,
    seedCommitment: round.seed_commitment,
    snapshot,
    snapshotHash: round.snapshot_hash,
    algorithmVersion: round.algorithm_version,
    expectedResultHash: round.result_hash,
    numStages: ((round.num_stages as number | undefined) ?? 5) as 3 | 4 | 5,
  });

  return NextResponse.json(verification);
}

