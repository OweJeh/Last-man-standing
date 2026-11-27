import React from "react";
import Link from "next/link";
import { Plus, Radio } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const [
    { data: roundsData },
    { data: paymentsData },
    { count: totalEntries },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from("raffle_rounds").select("*"),
    supabase.from("payment_submissions").select("amount_pesewas, status"),
    supabase.from("entries").select("id", { count: "exact", head: true }),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rounds = roundsData ?? [];
  const payments = paymentsData ?? [];

  const approvedOrConsumed = payments.filter(
    (p) => p.status === "approved" || p.status === "consumed"
  );
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalCollections = approvedOrConsumed.reduce(
    (sum, p) => sum + p.amount_pesewas,
    0
  );

  const activeRaffles = rounds.filter((r) =>
    ["live", "full", "locked", "running"].includes(r.status)
  );
  const completedRaffles = rounds.filter((r) =>
    ["completed", "archived"].includes(r.status)
  );

  const totalPrizeObligations = rounds
    .filter((r) => ["live", "full", "locked", "running", "completed"].includes(r.status))
    .reduce((sum, r) => sum + r.prize_pool_pesewas, 0);

  const totalOwnerProfit = completedRaffles.reduce(
    (sum, r) => sum + r.owner_profit_pesewas,
    0
  );

  const liveOrRunning = activeRaffles[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Admin Command Overview
          </h1>
          <p className="text-sm text-[#999999]">
            Live financial collections, payment queues, and competition operations.
          </p>
        </div>
        <div className="flex gap-2">
          {liveOrRunning && (
            <Link href={`/admin/raffles/${liveOrRunning.id}/control`}>
              <Button variant="secondary">
                <Radio className="h-4 w-4 text-[#EF3038]" />
                Live Control Room
              </Button>
            </Link>
          )}
          <Link href="/admin/raffles/create">
            <Button>
              <Plus className="h-4 w-4" />
              Create Raffle
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">
            Confirmed Collections
          </span>
          <p className="font-display text-2xl font-bold text-[#36B879] tabular-nums mt-1">
            {formatGhs(totalCollections)}
          </p>
        </Card>
        <Link href="/admin/payments" className="block">
          <Card className="bg-[#141414] border-white/10 hover:border-[#EF3038]/50 transition-colors p-5">
            <span className="text-[11px] uppercase text-[#999999]">Pending Payments</span>
            <p className="font-display text-2xl font-bold text-[#EF3038] tabular-nums mt-1">
              {pendingPayments.length}
            </p>
          </Card>
        </Link>
        <Link href="/admin/participants" className="block">
          <Card className="bg-[#141414] border-white/10 hover:border-white/30 transition-colors p-5">
            <span className="text-[11px] uppercase text-[#999999]">Confirmed Entries</span>
            <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
              {totalEntries ?? 0}
            </p>
          </Card>
        </Link>
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">
            Approved Payments
          </span>
          <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
            {approvedOrConsumed.length}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">Active Raffles</span>
          <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
            {activeRaffles.length}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">Completed Raffles</span>
          <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
            {completedRaffles.length}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">
            Prize Obligations
          </span>
          <p className="font-display text-2xl font-bold text-[#D8B66B] tabular-nums mt-1">
            {formatGhs(totalPrizeObligations)}
          </p>
        </Card>
        <Card className="bg-[#141414] border-white/10 p-5">
          <span className="text-[11px] uppercase text-[#999999]">
            Realized Owner Profit
          </span>
          <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
            {formatGhs(totalOwnerProfit)}
          </p>
        </Card>
      </div>

      {/* Recent Audit Activity */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">Recent Audit Activity</h2>
        <Card className="bg-[#141414] border-white/10 divide-y divide-white/10">
          {(recentAudit ?? []).length === 0 ? (
            <p className="p-6 text-sm text-[#999999]">No recent audit events.</p>
          ) : (
            (recentAudit ?? []).map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-white">{log.action}</span>
                  <span className="text-[#999999] ml-2">
                    ({log.target_type}: {log.target_id.slice(0, 8)}...)
                  </span>
                </div>
                <span className="text-[#666666]">{formatDateTime(log.created_at)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

