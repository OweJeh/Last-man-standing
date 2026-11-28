import React from "react";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RaffleRound, StageResult, Winner } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function WinnerDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  const { data: roundData } = await supabase
    .from("raffle_rounds")
    .select("*")
    .eq("id", roundId)
    .in("status", ["completed", "archived"])
    .single();

  if (!roundData) notFound();
  const round = roundData as RaffleRound;

  const [{ data: winnersData }, { data: stagesData }] = await Promise.all([
    supabase
      .from("winners")
      .select("id, round_id, position, display_name, assigned_number, prize_pesewas, created_at")
      .eq("round_id", roundId)
      .order("position", { ascending: true }),
    supabase
      .from("stage_results")
      .select("*")
      .eq("round_id", roundId)
      .order("stage_number", { ascending: true }),
  ]);

  const winners = (winnersData ?? []) as Winner[];
  const stages = (stagesData ?? []) as StageResult[];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="gold">Official Results</Badge>
              <span className="font-mono text-xs text-[#999999]">{round.round_code}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">{round.name}</h1>
            {round.completed_at && (
              <p className="text-sm text-[#999999] mt-1">
                Completed {formatDateTime(round.completed_at)} ·{" "}
                {round.confirmed_entries_count} Participants
              </p>
            )}
          </div>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {winners.map((w) => (
            <Card
              key={w.id}
              className={
                w.position === 1
                  ? "bg-[#141414] border-[#D8B66B]"
                  : "bg-[#141414] border-white/15"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D8B66B] flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" />
                    {w.position === 1
                      ? "1st Place"
                      : w.position === 2
                      ? "2nd Place"
                      : "3rd Place"}
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    #{w.assigned_number}
                  </span>
                </div>
                <CardTitle className="text-2xl mt-2">{w.display_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold text-[#D8B66B] tabular-nums">
                  {formatGhs(w.prize_pesewas)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 5 Elimination Stages */}
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Elimination Stage Log</h2>
          {stages.map((s) => (
            <Card key={s.id} className="bg-[#141414] border-white/10 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-lg font-bold">
                  Stage {s.stage_number} — {s.eliminated_numbers.length} Eliminated,{" "}
                  {s.surviving_numbers.length} Survived
                </span>
                <span className="text-xs text-[#999999]">
                  {formatDateTime(s.published_at)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.eliminated_numbers.map((num) => (
                  <span
                    key={num}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[#303030] px-2 font-display text-xs font-bold text-[#999999] tabular-nums"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

