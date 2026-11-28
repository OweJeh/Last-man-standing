import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
  CheckCircle2,
  Grid3X3,
} from "lucide-react";
import { GridBackgroundAnimation } from "@/components/ui/grid-bg-animation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatGhs } from "@/lib/money";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RaffleRound, Winner } from "@/types/database";

export const dynamic = "force-dynamic";

function getStatusBadge(status: RaffleRound["status"]) {
  switch (status) {
    case "live":
      return <Badge variant="live">LIVE — OPEN</Badge>;
    case "full":
      return <Badge variant="gold">FULL</Badge>;
    case "running":
    case "locked":
      return <Badge variant="live">LIVE DRAW</Badge>;
    case "completed":
    case "archived":
      return <Badge variant="success">VIEW RESULTS</Badge>;
    default:
      return <Badge variant="muted">UPCOMING</Badge>;
  }
}

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const [
    profile,
    { data: roundsData },
    { data: winnersData },
    { count: totalEntriesCount },
    { count: completedRoundsCount },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("raffle_rounds")
      .select("*")
      .in("status", ["published", "live", "full", "locked", "running", "completed"])
      .order("created_at", { ascending: false })
      .limit(9),
    supabase
      .from("winners")
      .select("*, raffle_rounds(name, round_code)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("public_participants").select("id", { count: "exact", head: true }),
    supabase
      .from("raffle_rounds")
      .select("id", { count: "exact", head: true })
      .in("status", ["completed", "archived"]),
  ]);

  const rounds = (roundsData ?? []) as RaffleRound[];
  const liveOrRunning = rounds.find((r) => r.status === "running" || r.status === "live");
  const activeEntryRound = rounds.find((r) => r.status === "live");
  const featuredLiveRounds = rounds.filter(
    (r) => r.status === "live" || r.status === "running"
  );
  const recentWinners = (winnersData ?? []) as Array<
    Winner & { raffle_rounds?: { name: string; round_code: string } | null }
  >;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar
        userEmail={profile?.email}
        isAdmin={profile?.role === "admin"}
        liveRoundId={liveOrRunning?.id ?? null}
      />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Animated grid background */}
        <GridBackgroundAnimation
          intensity="subtle"
          className="absolute inset-0 z-0"
        />

        {/* Top red radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(239,48,56,0.18),transparent_65%)] z-[1]"
        />
        {/* Bottom fade to page bg */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#080808] z-[1]"
        />

        <div className="relative z-[2] mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#141414] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#999999]">
              <span className="h-2 w-2 rounded-full bg-[#EF3038] animate-pulse" />
              Televised-Grade Grid Elimination
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.03] uppercase">
              ONE NUMBER. ONE CHANCE.{" "}
              <span className="text-[#EF3038]">LAST MAN STANDING.</span>
            </h1>

            <p className="text-base sm:text-xl text-[#999999] max-w-2xl leading-relaxed">
              Choose your number. Enter the competition. Watch the grid. Survive every
              elimination.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link href={activeEntryRound ? `/raffles/${activeEntryRound.id}` : "/raffles"}>
                <Button size="lg" className="w-full sm:w-auto">
                  ENTER A RAFFLE
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={liveOrRunning ? `/live/${liveOrRunning.id}` : "/raffles"}>
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Radio className="h-4 w-4 text-[#EF3038]" />
                  WATCH LIVE
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE & PUBLISHED RAFFLES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EF3038]">
              Live & Upcoming Arenas
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold mt-1">
              Published Competitions
            </h2>
          </div>
          <Link
            href="/raffles"
            className="text-sm font-semibold text-[#999999] hover:text-white inline-flex items-center gap-1"
          >
            View all raffles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredLiveRounds.length === 0 ? (
          <Card className="bg-[#141414] border-white/10 p-10 text-center space-y-3">
            <p className="font-display text-lg font-bold">No Live Raffle Right Now</p>
            <p className="text-sm text-[#999999]">
              An administrator will activate the next competition shortly.
            </p>
            <Link href="/raffles" className="inline-block pt-1">
              <Button variant="secondary" size="sm">
                View All Raffles
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredLiveRounds.map((round) => {
              const isCompleted =
                round.status === "completed" || round.status === "archived";
              const isRunning = round.status === "running" || round.status === "locked";
              const href = isRunning
                ? `/live/${round.id}`
                : isCompleted
                ? `/winners/${round.id}`
                : `/raffles/${round.id}`;

              return (
                <Card
                  key={round.id}
                  className="flex flex-col justify-between border-white/10 bg-[#141414] hover:border-white/25 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs text-[#999999]">
                        {round.round_code}
                      </span>
                      {getStatusBadge(round.status)}
                    </div>
                    <CardTitle className="text-xl">{round.name}</CardTitle>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold text-white tabular-nums">
                        {formatGhs(round.entry_fee_pesewas)}
                      </span>
                      <span className="text-xs text-[#999999]">per entry</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-[#0d0d0d] p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#999999]">Total Prize Pool</span>
                        <span className="font-display font-bold text-[#D8B66B] tabular-nums">
                          {formatGhs(round.prize_pool_pesewas)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#999999]">1st Place</span>
                        <span className="font-semibold text-white tabular-nums">
                          {formatGhs(round.first_prize_pesewas)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#999999]">2nd Place</span>
                        <span className="font-semibold text-white tabular-nums">
                          {formatGhs(round.second_prize_pesewas)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#999999]">3rd Place</span>
                        <span className="font-semibold text-white tabular-nums">
                          {formatGhs(round.third_prize_pesewas)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#999999]">Slots Filled</span>
                        <span className="font-display font-bold tabular-nums">
                          {round.confirmed_entries_count} / {round.participant_capacity}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#242424] overflow-hidden">
                        <div
                          className="h-full bg-[#EF3038] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (round.confirmed_entries_count / round.participant_capacity) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Link href={href} className="block">
                      <Button
                        variant={round.status === "live" ? "primary" : "secondary"}
                        className="w-full"
                      >
                        {round.status === "live"
                          ? "Enter Competition"
                          : isRunning
                          ? "Watch Live Draw"
                          : isCompleted
                          ? "View Results"
                          : "View Details"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. HOW THE COMPETITION WORKS */}
      <section className="border-y border-white/10 bg-[#0d0d0d] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EF3038]">
              5-Stage Elimination
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold mt-1">
              How Last Man Standing Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: "01",
                title: "Enter & Verify",
                desc: "Select the live raffle, transfer the entry fee via MoMo, and submit your transaction ID for admin verification.",
              },
              {
                step: "02",
                title: "Claim Your Number",
                desc: "Once approved, choose your public display name and lock in an available number on the 1–100 grid.",
              },
              {
                step: "03",
                title: "Survive 4 Grid Cuts",
                desc: "Watch the red scanner sweep the arena: 100 → 50 → 25 → 12 → 6 survivors remain.",
              },
              {
                step: "04",
                title: "The Final Six & Podium",
                desc: "Six finalists shuffle and drop one by one until the final 3 claim 3rd, 2nd, and 1st place prizes.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-3"
              >
                <span className="font-display text-2xl font-bold text-[#EF3038]">
                  {item.step}
                </span>
                <h3 className="font-display text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-[#999999] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PLATFORM STATS & RECENT WINNERS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 space-y-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 flex items-center gap-4">
            <Users className="h-8 w-8 text-[#EF3038]" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#999999]">
                Confirmed Entries
              </p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {totalEntriesCount ?? 0}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 flex items-center gap-4">
            <Trophy className="h-8 w-8 text-[#D8B66B]" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#999999]">
                Completed Raffles
              </p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {completedRoundsCount ?? 0}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 flex items-center gap-4">
            <Grid3X3 className="h-8 w-8 text-[#36B879]" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#999999]">
                Draw Engine
              </p>
              <p className="font-display text-xl font-bold">Cryptographic</p>
            </div>
          </div>
        </div>

        {/* Recent Winners */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Recent Winners</h2>
            <Link
              href="/winners"
              className="text-sm font-semibold text-[#999999] hover:text-white inline-flex items-center gap-1"
            >
              All results <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentWinners.length === 0 ? (
            <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
              Winners will appear here as soon as the first competition concludes.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentWinners.map((w) => (
                <Link key={w.id} href={`/winners/${w.round_id}`}>
                  <Card className="bg-[#141414] border-white/10 hover:border-[#D8B66B]/50 transition-colors p-5">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="gold">
                        {w.position === 1
                          ? "1st Place"
                          : w.position === 2
                          ? "2nd Place"
                          : "3rd Place"}
                      </Badge>
                      <span className="font-mono text-xs text-[#999999]">
                        #{w.assigned_number}
                      </span>
                    </div>
                    <p className="font-display text-lg font-bold text-white">
                      {w.display_name}
                    </p>
                    <p className="font-display text-xl font-bold text-[#D8B66B] tabular-nums mt-1">
                      {formatGhs(w.prize_pesewas)}
                    </p>
                    <p className="text-xs text-[#999999] mt-2">
                      {w.raffle_rounds?.name || "Completed Round"}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Security & FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#36B879]">
              <ShieldCheck className="h-4 w-4" />
              Tamper-Proof Draw Engine
            </div>
            <h3 className="font-display text-2xl font-bold">
              Locked Before the First Elimination
            </h3>
            <p className="text-sm text-[#999999] leading-relaxed">
              Before Phase 1 begins, the server locks the participant snapshot and
              computes every elimination stage deterministically using Node.js
              cryptographic randomness so no one—including admins—can alter outcomes
              mid-draw.
            </p>
            <ul className="space-y-2 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#36B879]" />
                Server-side cryptographic randomness only
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#36B879]" />
                No manual winner overrides or post-lock edits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#36B879]" />
                Instant SMS congratulations for top 3 winners
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-2xl font-bold">Frequently Asked Questions</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-white">
                  How many entries can I have in one raffle?
                </p>
                <p className="text-[#999999] mt-1">
                  Each registered account can hold up to 3 confirmed entries per raffle.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">
                  Why is MoMo payment verified manually?
                </p>
                <p className="text-[#999999] mt-1">
                  Every MoMo transfer is checked against actual transaction records to
                  prevent fake references and duplicate claims before unlocking your number.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">
                  Can spectators watch without creating an account?
                </p>
                <p className="text-[#999999] mt-1">
                  Yes. Every live draw has a public broadcast link you can share on TikTok,
                  Telegram, or WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

