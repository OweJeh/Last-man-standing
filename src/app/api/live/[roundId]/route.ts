import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await context.params;
  const supabase = await createServerSupabaseClient();

  const { data: round } = await supabase
    .from("raffle_rounds")
    .select("*")
    .eq("id", roundId)
    .in("status", ["published", "live", "full", "locked", "running", "completed", "archived"])
    .single();

  if (!round) {
    return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  }

  const [{ data: participants }, { data: stageResults }, { data: winners }, { data: events }] =
    await Promise.all([
      supabase
        .from("public_participants")
        .select("*")
        .eq("round_id", roundId)
        .order("assigned_number", { ascending: true }),
      supabase
        .from("stage_results")
        .select("*")
        .eq("round_id", roundId)
        .order("stage_number", { ascending: true }),
      supabase
        .from("winners")
        .select("id, round_id, position, display_name, assigned_number, prize_pesewas, created_at")
        .eq("round_id", roundId)
        .order("position", { ascending: true }),
      supabase
        .from("raffle_events")
        .select("*")
        .eq("round_id", roundId)
        .order("sequence_number", { ascending: true }),
    ]);

  return NextResponse.json({
    round,
    participants: participants ?? [],
    stageResults: stageResults ?? [],
    winners: winners ?? [],
    events: events ?? [],
  });
}

