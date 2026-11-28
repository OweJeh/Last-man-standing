import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Radio } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const [profile, { data: round }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("raffle_rounds")
      .select("*")
      .eq("id", roundId)
      .in("status", ["published", "live", "full", "locked", "running", "completed", "archived"])
      .single(),
  ]);

  if (!round) {
    notFound();
  }

  // Gate live broadcast to signed-in participants of this raffle (and admins)
  let isAuthorized = false;
  if (profile) {
    if (profile.role === "admin") {
      isAuthorized = true;
    } else {
      const { count } = await supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("user_id", profile.id);
      isAuthorized = (count ?? 0) > 0;
    }
  }

  if (!profile || !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col">
        <Navbar
          userEmail={profile?.email}
          isAdmin={profile?.role === "admin"}
          liveRoundId={roundId}
        />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md border-white/10 bg-[#141414]">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#EF3038] mb-1">
                <Lock className="h-3.5 w-3.5" />
                Participants-Only Live Stream
              </div>
              <CardTitle className="text-2xl">{round.name}</CardTitle>
              <p className="text-sm text-[#999999]">
                {!profile
                  ? "Create an account or sign in and enter this raffle to watch the live elimination draw as it runs."
                  : "Only members participating in this raffle can watch the live broadcast."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!profile ? (
                <>
                  <Link href={`/login?redirect=/live/${roundId}`} className="block">
                    <Button className="w-full">Sign In to Watch</Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button variant="secondary" className="w-full">
                      Create Account
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={`/raffles/${roundId}`} className="block">
                    <Button className="w-full">
                      <Radio className="h-4 w-4" />
                      {round.status === "live" ? "Enter This Raffle" : "View Raffle Details"}
                    </Button>
                  </Link>
                  <Link href="/raffles" className="block">
                    <Button variant="secondary" className="w-full">
                      Browse Active Raffles
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
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

