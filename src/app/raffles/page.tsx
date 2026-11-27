import React from "react";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatGhs } from "@/lib/money";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RaffleRound } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  const { data } = await supabase
    .from("raffle_rounds")
    .select("*")
    .in("status", ["published", "live", "full", "locked", "running", "completed", "archived"])
    .order("created_at", { ascending: false });

  const rounds = (data ?? []) as RaffleRound[];
  const liveRound = rounds.find((r) => r.status === "running" || r.status === "live");

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar
        userEmail={profile?.email}
        isAdmin={profile?.role === "admin"}
        liveRoundId={liveRound?.id ?? null}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EF3038]">
            Competitions
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
            All Published Raffles
          </h1>
          <p className="text-sm text-[#999999] mt-2">
            Only one raffle accepts entries at a time. Upcoming, running, and completed
            rounds are listed below.
          </p>
        </div>

        {rounds.length === 0 ? (
          <Card className="bg-[#141414] border-white/10 p-10 text-center text-[#999999]">
            No published raffles available right now.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rounds.map((r) => (
              <Card key={r.id} className="bg-[#141414] border-white/10 flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-[#999999]">{r.round_code}</span>
                    <Badge variant={r.status === "live" || r.status === "running" ? "live" : "default"}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{r.name}</CardTitle>
                  {r.description && (
                    <p className="text-xs text-[#999999] mt-1 line-clamp-2">{r.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Entry Fee</span>
                    <span className="font-display font-bold tabular-nums">
                      {formatGhs(r.entry_fee_pesewas)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Prize Pool</span>
                    <span className="font-display font-bold text-[#D8B66B] tabular-nums">
                      {formatGhs(r.prize_pool_pesewas)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Slots</span>
                    <span className="font-display font-bold tabular-nums">
                      {r.confirmed_entries_count} / {r.participant_capacity}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/raffles/${r.id}`} className="flex-1">
                      <Button variant={r.status === "live" ? "primary" : "secondary"} className="w-full">
                        {r.status === "live" ? "Enter Now" : "Details"}
                      </Button>
                    </Link>
                    {(r.status === "running" || r.status === "completed") && (
                      <Link href={`/live/${r.id}`}>
                        <Button variant="outline">Live View</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

