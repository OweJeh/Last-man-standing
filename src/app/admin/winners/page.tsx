import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatGhs } from "@/lib/money";
import { formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("winners")
    .select("*, raffle_rounds(round_code, name)")
    .order("created_at", { ascending: false });

  const winners = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold">Winners</h1>
      <div className="space-y-3">
        {winners.length === 0 ? (
          <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
            No winners recorded yet.
          </Card>
        ) : (
          winners.map((w) => (
            <Card
              key={w.id}
              className="bg-[#141414] border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="gold">Position #{w.position}</Badge>
                  <span className="font-mono text-xs text-[#999999]">
                    {w.raffle_rounds?.round_code}
                  </span>
                </div>
                <p className="font-display text-lg font-bold">
                  {w.display_name} (#{w.assigned_number})
                </p>
                <p className="text-xs text-[#999999]">
                  {w.raffle_rounds?.name} · {formatShortDate(w.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-bold text-[#D8B66B] tabular-nums">
                  {formatGhs(w.prize_pesewas)}
                </p>
                <Link
                  href={`/winners/${w.round_id}`}
                  className="text-xs text-[#999999] hover:text-white"
                >
                  View public results →
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

