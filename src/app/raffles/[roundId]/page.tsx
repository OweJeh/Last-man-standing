import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Radio, CheckCircle2, Clock } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { formatGhs } from "@/lib/money";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackgroundAnimation } from "@/components/ui/grid-bg-animation";
import { NumberSelectionGrid } from "@/components/raffle/number-selection-grid";
import { PaymentSubmissionForm } from "@/components/raffle/payment-submission-form";
import type {
  PaymentSubmission,
  PlatformSettings,
  PublicParticipant,
  RaffleRound,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function RaffleDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const supabase = await createServerSupabaseClient();

  const [
    profile,
    { data: roundData },
    { data: participantsData },
    { data: settingsData },
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
    supabase.from("platform_settings").select("*").eq("id", 1).single(),
  ]);

  if (!roundData) notFound();
  const round = roundData as RaffleRound;

  const participants = (participantsData ?? []) as PublicParticipant[];
  const settings = (settingsData ?? {
    default_momo_network: "MTN MoMo",
    default_momo_number: "024 000 0000",
    default_momo_account_name: "Last Man Standing Ltd",
  }) as PlatformSettings;

  let userPayments: PaymentSubmission[] = [];
  let userOwnedNumbers: number[] = [];

  if (profile) {
    const [{ data: pData }, { data: eData }] = await Promise.all([
      supabase
        .from("payment_submissions")
        .select("*")
        .eq("round_id", roundId)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("entries")
        .select("assigned_number")
        .eq("round_id", roundId)
        .eq("user_id", profile.id),
    ]);

    userPayments = (pData ?? []) as PaymentSubmission[];
    userOwnedNumbers = (eData ?? []).map((x) => x.assigned_number);
  }

  const approvedPayment = userPayments.find((p) => p.status === "approved") ?? null;
  const pendingPayments = userPayments.filter((p) => p.status === "pending");

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col relative overflow-hidden">
      {/* Animated grid background — medium intensity for the arena feel */}
      <GridBackgroundAnimation intensity="medium" className="fixed inset-0 z-0" />
      {/* Gradient overlay keeps content readable */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_top_right,rgba(239,48,56,0.08),transparent_55%)]"
      />

      <Navbar
        userEmail={profile?.email}
        isAdmin={profile?.role === "admin"}
        liveRoundId={round.status === "running" || round.status === "live" ? round.id : null}
      />

      <main className="relative z-[2] flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 space-y-8">
        {/* Header Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-white/10 bg-[#141414] p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={round.status === "live" || round.status === "running" ? "live" : "default"}>
                {round.status.toUpperCase()}
              </Badge>
              <span className="font-mono text-xs text-[#999999]">{round.round_code}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">{round.name}</h1>
            {round.description && (
              <p className="text-sm text-[#999999] max-w-2xl">{round.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/live/${round.id}`}>
              <Button variant="secondary">
                <Radio className="h-4 w-4 text-[#EF3038]" />
                Live Broadcast View
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial & Slot Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="bg-[#141414] border-white/10 p-4">
            <span className="text-[11px] uppercase text-[#999999]">Entry Fee</span>
            <p className="font-display text-xl font-bold tabular-nums mt-0.5">
              {formatGhs(round.entry_fee_pesewas)}
            </p>
          </Card>
          <Card className="bg-[#141414] border-white/10 p-4">
            <span className="text-[11px] uppercase text-[#999999]">Prize Pool</span>
            <p className="font-display text-xl font-bold text-[#D8B66B] tabular-nums mt-0.5">
              {formatGhs(round.prize_pool_pesewas)}
            </p>
          </Card>
          <Card className="bg-[#141414] border-white/10 p-4">
            <span className="text-[11px] uppercase text-[#999999]">1st Place</span>
            <p className="font-display text-xl font-bold tabular-nums mt-0.5">
              {formatGhs(round.first_prize_pesewas)}
            </p>
          </Card>
          <Card className="bg-[#141414] border-white/10 p-4">
            <span className="text-[11px] uppercase text-[#999999]">2nd / 3rd</span>
            <p className="font-display text-sm font-bold tabular-nums mt-1">
              {formatGhs(round.second_prize_pesewas)} / {formatGhs(round.third_prize_pesewas)}
            </p>
          </Card>
          <Card className="bg-[#141414] border-white/10 p-4 col-span-2 sm:col-span-1">
            <span className="text-[11px] uppercase text-[#999999]">Confirmed</span>
            <p className="font-display text-xl font-bold tabular-nums mt-0.5">
              {round.confirmed_entries_count} / {round.participant_capacity}
            </p>
          </Card>
        </div>

        {/* Participant Entry Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-xl font-bold">
              Number Grid (1–{round.participant_capacity})
            </h2>
            <NumberSelectionGrid
              roundId={round.id}
              capacity={round.participant_capacity}
              isLive={round.status === "live"}
              initialParticipants={participants}
              approvedPaymentId={approvedPayment?.id ?? null}
              userOwnedNumbers={userOwnedNumbers}
            />
          </div>

          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-xl font-bold">Enter This Competition</h2>

            {!profile ? (
              <Card className="bg-[#141414] border-white/10">
                <CardHeader>
                  <CardTitle>Sign In to Enter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-[#999999]">
                    Create an account or sign in to submit your MoMo payment and claim a
                    number on the grid.
                  </p>
                  <div className="flex gap-3">
                    <Link href={`/login?redirect=/raffles/${round.id}`} className="flex-1">
                      <Button className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button variant="secondary" className="w-full">
                        Register
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : round.status !== "live" ? (
              <Card className="bg-[#141414] border-white/10 p-6 space-y-3">
                <p className="font-display text-lg font-bold">
                  {round.status === "published"
                    ? "Upcoming Competition"
                    : round.status === "full"
                    ? "Raffle Full (100/100)"
                    : round.status === "running"
                    ? "Draw In Progress"
                    : "Competition Completed"}
                </p>
                <p className="text-sm text-[#999999]">
                  Entries are only accepted when an administrator activates this raffle to
                  LIVE status.
                </p>
              </Card>
            ) : (
              <>
                {approvedPayment && (
                  <div className="rounded-xl border border-[#36B879]/50 bg-[#36B879]/10 p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#36B879] shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-white">Payment Approved!</p>
                      <p className="text-[#999999]">
                        Ref <span className="font-mono">{approvedPayment.transaction_reference}</span>{" "}
                        is verified. Select an available white tile on the grid and confirm
                        your display name.
                      </p>
                    </div>
                  </div>
                )}

                {pendingPayments.length > 0 && (
                  <div className="rounded-xl border border-[#D8B66B]/40 bg-[#D8B66B]/10 p-4 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[#D8B66B] shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-white">
                        {pendingPayments.length} Pending Verification
                      </p>
                      <p className="text-[#999999]">
                        Your MoMo submission is awaiting admin approval.
                      </p>
                    </div>
                  </div>
                )}

                <PaymentSubmissionForm
                  roundId={round.id}
                  entryFeePesewas={round.entry_fee_pesewas}
                  momoInstructions={round.momo_instructions}
                  defaultMomoNetwork={settings.default_momo_network}
                  defaultMomoNumber={settings.default_momo_number}
                  defaultMomoAccountName={settings.default_momo_account_name}
                  defaultSenderPhone={profile.phone || ""}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

