import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardEntryDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: entry } = await supabase
    .from("entries")
    .select("*, raffle_rounds(*), payment_submissions(*)")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .single();

  if (!entry) notFound();

  const { data: winRecord } = await supabase
    .from("winners")
    .select("*")
    .eq("entry_id", entry.id)
    .maybeSingle();

  const round = entry.raffle_rounds;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Entry Ticket</h1>
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
            ? `ELIMINATED IN ROUND ${entry.eliminated_stage}`
            : entry.status.toUpperCase()}
        </Badge>
      </div>

      <Card className="bg-[#141414] border-white/10 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase text-[#999999]">Public Display Name</p>
            <p className="font-display text-2xl font-bold mt-1">{entry.display_name}</p>
            <p className="text-xs text-[#999999] mt-1">
              {round?.name} ({round?.round_code})
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-[#080808] font-display text-4xl font-bold tabular-nums">
            {entry.assigned_number}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-[#999999] block">Entry Date</span>
            <span>{formatDateTime(entry.created_at)}</span>
          </div>
          <div>
            <span className="text-xs text-[#999999] block">Payment Ref</span>
            <span className="font-mono">
              {entry.payment_submissions?.transaction_reference}
            </span>
          </div>
        </div>

        {entry.status === "eliminated" && entry.eliminated_at && (
          <div className="rounded-lg border border-white/10 bg-[#0d0d0d] p-4 text-sm text-[#999999]">
            Eliminated in Stage {entry.eliminated_stage} on{" "}
            {formatDateTime(entry.eliminated_at)}.
          </div>
        )}

        {winRecord && (
          <div className="rounded-lg border border-[#D8B66B]/50 bg-[#D8B66B]/10 p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D8B66B]">
              Winner — Position #{winRecord.position}
            </p>
            <p className="font-display text-2xl font-bold text-white tabular-nums">
              {formatGhs(winRecord.prize_pesewas)}
            </p>
            <p className="text-xs text-[#999999]">
              Payout Status: {winRecord.payout_status.toUpperCase()}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href={`/live/${entry.round_id}`}>
            <Button variant="primary">Watch Live Grid</Button>
          </Link>
          <Link href="/dashboard/entries">
            <Button variant="secondary">Back to Entries</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

