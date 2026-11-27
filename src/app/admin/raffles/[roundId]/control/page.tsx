import React from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { LiveControlClient } from "@/components/admin/live-control-client";
import type {
  PublicParticipant,
  RaffleEvent,
  RaffleRound,
  StageResult,
  Winner,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminControlRoomPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const [, { roundId }] = await Promise.all([requireAdmin(), params]);
  const supabase = createAdminSupabaseClient();

  const [
    { data: roundData },
    { count: survivorsCount },
    { count: eliminatedCount },
    { data: participants },
    { data: stageResults },
    { data: winners },
    { data: events },
  ] = await Promise.all([
    supabase.from("raffle_rounds").select("*").eq("id", roundId).single(),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("round_id", roundId)
      .in("status", ["alive", "winner"]),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("round_id", roundId)
      .eq("status", "eliminated"),
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

  if (!roundData) notFound();
  const round = roundData as RaffleRound;

  return (
    <div className="space-y-8">
      <div>
        <span className="font-mono text-xs text-[#999999]">{round.round_code}</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Live Control Room — {round.name}
        </h1>
      </div>

      <LiveControlClient
        round={round}
        survivorsCount={survivorsCount ?? 0}
        eliminatedCount={eliminatedCount ?? 0}
        participants={(participants ?? []) as PublicParticipant[]}
        stageResults={(stageResults ?? []) as StageResult[]}
        winners={(winners ?? []) as Winner[]}
        events={(events ?? []) as RaffleEvent[]}
      />
    </div>
  );
}

