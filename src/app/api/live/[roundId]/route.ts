import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await context.params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [{ data: profile }, { count: entryCount }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("round_id", roundId)
      .eq("user_id", user.id),
  ]);

  const isAdmin = profile?.role === "admin";
  if (!isAdmin && (entryCount ?? 0) === 0) {
    return NextResponse.json(
      { error: "Only participants in this raffle can access the live stream" },
      { status: 403 }
    );
  }

  const { data: round } = await supabase
    .from("raffle_rounds")
    .select(
      "id, round_code, name, description, entry_fee_pesewas, participant_capacity, num_stages, gross_revenue_pesewas, owner_profit_pesewas, prize_pool_pesewas, allocation_method, first_prize_pesewas, second_prize_pesewas, third_prize_pesewas, status, current_stage, confirmed_entries_count, started_at, completed_at"
    )
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

  return NextResponse.json(
    {
      round,
      participants: participants ?? [],
      stageResults: stageResults ?? [],
      winners: winners ?? [],
      events: events ?? [],
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

