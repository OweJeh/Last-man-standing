import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardEntriesPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("entries")
    .select("*, raffle_rounds(id, round_code, name, entry_fee_pesewas)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const entries = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold">My Entries</h1>

      {entries.length === 0 ? (
        <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
          No confirmed entries yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((e) => {
            const round = e.raffle_rounds as {
              id: string;
              round_code: string;
              name: string;
              entry_fee_pesewas: number;
            } | null;

            return (
              <Link key={e.id} href={`/dashboard/entries/${e.id}`}>
                <Card className="bg-[#141414] border-white/10 hover:border-white/25 transition-colors p-5 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#999999]">
                        {round?.round_code}
                      </span>
                      <Badge
                        variant={
                          e.status === "winner"
                            ? "gold"
                            : e.status === "alive"
                            ? "success"
                            : "muted"
                        }
                      >
                        {e.status === "eliminated"
                          ? `ELIMINATED IN ROUND ${e.eliminated_stage}`
                          : e.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="font-display text-lg font-bold">{e.display_name}</p>
                    <p className="text-xs text-[#999999]">
                      {round?.name} ·{" "}
                      {round ? formatGhs(round.entry_fee_pesewas) : ""}
                    </p>
                    <p className="text-[11px] text-[#666666]">
                      Entered {formatDateTime(e.created_at)}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-[#080808] font-display text-2xl font-bold tabular-nums shrink-0">
                    {e.assigned_number}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

