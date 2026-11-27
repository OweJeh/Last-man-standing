import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { LiveBroadcastClient } from "@/components/raffle/live-broadcast-client";
import type {
  PublicParticipant,
  RaffleEvent,
  RaffleRound,
  StageResult,
  Winner,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LiveRoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const supabase = await createServerSupabaseClient();

  const [
    profile,
    { data: round },
    { data: participants },
    { data: stageResults },
    { data: winners },
    { data: events },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", roundId)
      .in("status", ["published", "live", "full", "locked", "running", "completed", "archived"])
      .single(),
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

  if (!round) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar
        userEmail={profile?.email}
        isAdmin={profile?.role === "admin"}
        liveRoundId={roundId}
      />
      <LiveBroadcastClient
        initialRound={round as RaffleRound}
        initialParticipants={(participants ?? []) as PublicParticipant[]}
        initialStageResults={(stageResults ?? []) as StageResult[]}
        initialWinners={(winners ?? []) as Winner[]}
        initialEvents={(events ?? []) as RaffleEvent[]}
      />
    </div>
  );
}

