"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePayoutStatusAction } from "@/app/actions/raffle-control";
import { formatGhs } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { PayoutStatus } from "@/types/database";

export interface PayoutRow {
  id: string;
  position: number;
  display_name: string;
  assigned_number: number;
  prize_pesewas: number;
  payout_status: PayoutStatus;
  payout_reference: string | null;
  raffle_rounds?: { round_code: string; name: string } | null;
  profiles?: { full_name: string; phone: string | null; email: string } | null;
}

export function PayoutsClient({ rows }: { rows: PayoutRow[] }) {
  const router = useRouter();
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleUpdate = async (id: string, status: PayoutStatus) => {
    setBusyId(id);
    await updatePayoutStatusAction(id, status, refs[id]);
    setBusyId(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
          No winner payouts queued.
        </Card>
      ) : (
        rows.map((w) => (
          <Card
            key={w.id}
            className="bg-[#141414] border-white/10 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    w.payout_status === "paid"
                      ? "success"
                      : w.payout_status === "processing"
                      ? "gold"
                      : "default"
                  }
                >
                  {w.payout_status.toUpperCase()}
                </Badge>
                <span className="font-mono text-xs text-[#999999]">
                  {w.raffle_rounds?.round_code} · Pos #{w.position}
                </span>
              </div>
              <p className="font-display text-lg font-bold">
                {w.display_name} (#{w.assigned_number}) — {formatGhs(w.prize_pesewas)}
              </p>
              <p className="text-xs text-[#999999]">
                Recipient: {w.profiles?.full_name} · {w.profiles?.phone || w.profiles?.email}
              </p>
            </div>

            {w.payout_status !== "paid" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="MoMo payout ref"
                  value={refs[w.id] ?? w.payout_reference ?? ""}
                  onChange={(e) =>
                    setRefs((prev) => ({ ...prev, [w.id]: e.target.value }))
                  }
                  className="h-9 w-44 text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === w.id}
                  onClick={() => handleUpdate(w.id, "processing")}
                >
                  Mark Processing
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  disabled={busyId === w.id}
                  onClick={() => handleUpdate(w.id, "paid")}
                >
                  Mark Paid
                </Button>
              </div>
            ) : (
              <span className="font-mono text-xs text-[#36B879]">
                Paid · Ref: {w.payout_reference || "Recorded"}
              </span>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

