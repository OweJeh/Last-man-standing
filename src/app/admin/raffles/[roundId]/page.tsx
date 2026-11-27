import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatGhs } from "@/lib/money";
import { RaffleForm } from "@/components/admin/raffle-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RaffleRound } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminRaffleDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  await requireAdmin();
  const { roundId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("raffle_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!data) notFound();
  const round = data as RaffleRound;

  if (round.status === "draft") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Edit Draft: {round.name}
        </h1>
        <RaffleForm existingDraft={round} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs text-[#999999]">{round.round_code}</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{round.name}</h1>
        </div>
        <Link href={`/admin/raffles/${round.id}/control`}>
          <Button>Open Control Room</Button>
        </Link>
      </div>

      <Card className="bg-[#141414] border-white/10 p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-xs text-[#999999] block">Status</span>
          <span className="font-bold uppercase">{round.status}</span>
        </div>
        <div>
          <span className="text-xs text-[#999999] block">Entry Fee</span>
          <span className="font-bold tabular-nums">{formatGhs(round.entry_fee_pesewas)}</span>
        </div>
        <div>
          <span className="text-xs text-[#999999] block">Occupancy</span>
          <span className="font-bold tabular-nums">
            {round.confirmed_entries_count} / {round.participant_capacity}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#999999] block">Prize Pool</span>
          <span className="font-bold text-[#D8B66B] tabular-nums">
            {formatGhs(round.prize_pool_pesewas)}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#999999] block">Owner Profit</span>
          <span className="font-bold tabular-nums">
            {formatGhs(round.owner_profit_pesewas)}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#999999] block">Financials Frozen</span>
          <span className="font-bold">
            {round.financials_frozen_at ? "Yes" : "No"}
          </span>
        </div>
      </Card>
    </div>
  );
}

