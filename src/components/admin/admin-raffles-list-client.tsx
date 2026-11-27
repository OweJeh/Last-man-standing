"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Play, PowerOff, Radio, Send, Archive, Edit } from "lucide-react";
import {
  activateRaffleAction,
  archiveRaffleAction,
  deactivateRaffleAction,
  duplicateRaffleAction,
  publishRaffleAction,
} from "@/app/actions/admin-raffles";
import { formatGhs } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { RaffleRound } from "@/types/database";

export function AdminRafflesListClient({ rounds }: { rounds: RaffleRound[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<RaffleRound | null>(null);

  const runAction = async (
    id: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMessage?: { title: string; description?: string }
  ) => {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) {
      setError(res.error || "Action failed");
      toast({ title: "Action failed", description: res.error, variant: "danger" });
      return;
    }
    if (successMessage) {
      toast({ ...successMessage, variant: "success" });
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-sm text-[#FF2020]">
          {error}
        </div>
      )}

      {/* Confirmation dialog for Activate Raffle */}
      {confirmActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Card className="max-w-md w-full bg-[#141414] border-[#EF3038]/50 p-6 space-y-4">
            <h3 className="font-display text-xl font-bold">Activate Raffle?</h3>
            <p className="text-sm text-[#999999]">
              Activating <strong className="text-white">{confirmActivate.name}</strong>{" "}
              ({formatGhs(confirmActivate.entry_fee_pesewas)}) will freeze its financial
              configuration and open it for participant MoMo payments.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setConfirmActivate(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const target = confirmActivate;
                  setConfirmActivate(null);
                  await runAction(target.id, () => activateRaffleAction(target.id));
                }}
              >
                Confirm Activate
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {rounds.map((r) => (
          <Card
            key={r.id}
            className="bg-[#141414] border-white/10 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "live" || r.status === "running" ? "live" : "default"}>
                  {r.status.toUpperCase()}
                </Badge>
                <span className="font-mono text-xs text-[#999999]">{r.round_code}</span>
                <span className="text-xs text-[#999999] tabular-nums">
                  {r.confirmed_entries_count}/{r.participant_capacity} entries
                </span>
              </div>
              <h3 className="font-display text-lg font-bold">{r.name}</h3>
              <p className="text-xs text-[#999999] tabular-nums">
                Entry: {formatGhs(r.entry_fee_pesewas)} · Gross:{" "}
                {formatGhs(r.gross_revenue_pesewas)} · Pool:{" "}
                {formatGhs(r.prize_pool_pesewas)} · Profit:{" "}
                {formatGhs(r.owner_profit_pesewas)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {r.status === "draft" && (
                <>
                  <Link href={`/admin/raffles/${r.id}`}>
                    <Button variant="secondary" size="sm">
                      <Edit className="h-3.5 w-3.5" />
                      Edit Draft
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => runAction(r.id, () => publishRaffleAction(r.id))}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish
                  </Button>
                </>
              )}

              {r.status === "published" && (
                <Button
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => setConfirmActivate(r)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Activate (Go Live)
                </Button>
              )}

              {r.status === "live" && r.confirmed_entries_count === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => runAction(r.id, () => deactivateRaffleAction(r.id))}
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  Deactivate
                </Button>
              )}

              {["full", "locked", "running", "completed"].includes(r.status) && (
                <Link href={`/admin/raffles/${r.id}/control`}>
                  <Button variant="primary" size="sm">
                    <Radio className="h-3.5 w-3.5" />
                    Control Room
                  </Button>
                </Link>
              )}

              {r.status === "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === r.id}
                  onClick={() => runAction(r.id, () => archiveRaffleAction(r.id))}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === r.id}
                onClick={() =>
                  runAction(r.id, () => duplicateRaffleAction(r.id), {
                    title: "Raffle duplicated",
                    description: "A new draft has been created with the same configuration.",
                  })
                }
                title="Duplicate configuration as new draft"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

