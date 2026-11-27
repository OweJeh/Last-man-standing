import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";
import { formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const [{ data: entriesData }, { data: paymentsData }, { data: liveRound }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("*, raffle_rounds(id, round_code, name, entry_fee_pesewas, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_submissions")
        .select("*, raffle_rounds(id, round_code, name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("raffle_rounds")
        .select("id, name, entry_fee_pesewas")
        .eq("status", "live")
        .maybeSingle(),
    ]);

  const entries = entriesData ?? [];
  const payments = paymentsData ?? [];

  const aliveCount = entries.filter((e) => e.status === "alive").length;
  const eliminatedCount = entries.filter((e) => e.status === "eliminated").length;
  const winnerCount = entries.filter((e) => e.status === "winner").length;
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const approvedPayments = payments.filter((p) => p.status === "approved");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Competitor Dashboard
          </h1>
          <p className="text-sm text-[#999999]">
            Track your active entries, MoMo payment approvals, and competition outcomes.
          </p>
        </div>
        {liveRound && (
          <Link href={`/raffles/${liveRound.id}`}>
            <Button>
              Enter {liveRound.name} ({formatGhs(liveRound.entry_fee_pesewas)})
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Approved payment callout */}
      {approvedPayments.length > 0 && (
        <div className="rounded-xl border border-[#36B879]/50 bg-[#36B879]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#36B879] shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-white">
                You have {approvedPayments.length} approved payment(s) ready to claim a
                number!
              </p>
              <p className="text-[#999999]">
                Pick your number on the grid before slots fill up.
              </p>
            </div>
          </div>
          <Link href={`/raffles/${approvedPayments[0].round_id}`}>
            <Button variant="success" size="sm">
              Claim Number Now
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-[#141414] border-white/10 p-4">
          <span className="text-[11px] uppercase text-[#999999]">Alive Entries</span>
          <p className="font-display text-2xl font-bold text-[#36B879] tabular-nums mt-1">
            {aliveCount}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-4">
          <span className="text-[11px] uppercase text-[#999999]">Eliminated</span>
          <p className="font-display text-2xl font-bold text-[#999999] tabular-nums mt-1">
            {eliminatedCount}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-4">
          <span className="text-[11px] uppercase text-[#999999]">Winning</span>
          <p className="font-display text-2xl font-bold text-[#D8B66B] tabular-nums mt-1">
            {winnerCount}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-4">
          <span className="text-[11px] uppercase text-[#999999]">Pending MoMo</span>
          <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
            {pendingPayments.length}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-4 col-span-2 lg:col-span-1">
          <span className="text-[11px] uppercase text-[#999999]">Ready to Claim</span>
          <p className="font-display text-2xl font-bold text-[#EF3038] tabular-nums mt-1">
            {approvedPayments.length}
          </p>
        </Card>
      </div>

      {/* Recent Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Recent Entries</h2>
          <Link href="/dashboard/entries" className="text-xs text-[#999999] hover:text-white">
            View all
          </Link>
        </div>

        {entries.length === 0 ? (
          <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
            <Clock className="h-8 w-8 mx-auto mb-2 text-[#666666]" />
            You have no confirmed raffle entries yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.slice(0, 4).map((entry) => {
              const round = entry.raffle_rounds as {
                id: string;
                round_code: string;
                name: string;
                entry_fee_pesewas: number;
              } | null;

              return (
                <Link key={entry.id} href={`/dashboard/entries/${entry.id}`}>
                  <Card className="bg-[#141414] border-white/10 hover:border-white/25 transition-colors p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#999999]">
                          {round?.round_code}
                        </span>
                        <Badge
                          variant={
                            entry.status === "winner"
                              ? "gold"
                              : entry.status === "alive"
                              ? "success"
                              : "muted"
                          }
                        >
                          {entry.status === "eliminated"
                            ? `ELIMINATED ROUND ${entry.eliminated_stage}`
                            : entry.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-display font-bold text-white">
                        {entry.display_name}
                      </p>
                      <p className="text-xs text-[#999999]">
                        {round?.name} · {formatShortDate(entry.created_at)}
                      </p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#080808] font-display text-2xl font-bold tabular-nums">
                      {entry.assigned_number}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

