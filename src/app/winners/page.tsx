import React from "react";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatGhs } from "@/lib/money";
import { formatShortDate } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RaffleRound, Winner } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  const { data: roundsData } = await supabase
    .from("raffle_rounds")
    .select("*")
    .in("status", ["completed", "archived"])
    .order("completed_at", { ascending: false });

  const rounds = (roundsData ?? []) as RaffleRound[];
  const roundIds = rounds.map((r) => r.id);

  let winners: Winner[] = [];
  if (roundIds.length > 0) {
    const { data: winnersData } = await supabase
      .from("winners")
      .select("id, round_id, position, display_name, assigned_number, prize_pesewas, created_at")
      .in("round_id", roundIds)
      .order("position", { ascending: true });
    winners = (winnersData ?? []) as Winner[];
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D8B66B]">
            Permanent Hall of Champions
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
            Past Winners & Results
          </h1>
          <p className="text-sm text-[#999999] mt-2">
            Every completed competition is permanently archived with full stage history
            and cryptographic verification.
          </p>
        </div>

        {rounds.length === 0 ? (
          <Card className="bg-[#141414] border-white/10 p-10 text-center text-[#999999]">
            No completed raffles yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rounds.map((round) => {
              const roundWinners = winners.filter((w) => w.round_id === round.id);
              const first = roundWinners.find((w) => w.position === 1);

              return (
                <Link key={round.id} href={`/winners/${round.id}`}>
                  <Card className="bg-[#141414] border-white/10 hover:border-[#D8B66B]/50 transition-colors h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#999999]">
                          {round.round_code}
                        </span>
                        <Badge variant="gold">
                          {round.completed_at ? formatShortDate(round.completed_at) : "Completed"}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mt-2">{round.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {first && (
                        <div className="rounded-lg border border-[#D8B66B]/30 bg-[#0d0d0d] p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-[#D8B66B]" />
                            <div>
                              <p className="text-[11px] uppercase text-[#D8B66B] font-semibold">
                                1st Place Champion
                              </p>
                              <p className="font-display text-lg font-bold">
                                {first.display_name} (#{first.assigned_number})
                              </p>
                            </div>
                          </div>
                          <span className="font-display text-lg font-bold text-[#D8B66B] tabular-nums">
                            {formatGhs(first.prize_pesewas)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-[#999999]">
                        <span>
                          Pool: {formatGhs(round.prize_pool_pesewas)} ·{" "}
                          {round.confirmed_entries_count} entries
                        </span>
                        <span className="inline-flex items-center gap-1 text-white font-semibold">
                          Full Results <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

