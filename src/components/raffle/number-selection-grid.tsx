"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { claimNumberAction } from "@/app/actions/entries";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PublicParticipant } from "@/types/database";

interface NumberSelectionGridProps {
  roundId: string;
  capacity: number;
  isLive: boolean;
  initialParticipants: PublicParticipant[];
  approvedPaymentId: string | null;
  userOwnedNumbers: number[];
}

export function NumberSelectionGrid({
  roundId,
  capacity,
  isLive,
  initialParticipants,
  approvedPaymentId,
  userOwnedNumbers,
}: NumberSelectionGridProps) {
  const router = useRouter();
  const [takenMap, setTakenMap] = useState<Map<number, PublicParticipant>>(() => {
    const map = new Map<number, PublicParticipant>();
    for (const p of initialParticipants) {
      map.set(p.assigned_number, p);
    }
    return map;
  });

  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ownedSet = new Set(userOwnedNumbers);
  const canClaim = isLive && Boolean(approvedPaymentId);

  // Realtime subscription to newly claimed numbers
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`round-grid-${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entries",
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          const row = payload.new as PublicParticipant;
          setTakenMap((prev) => {
            const next = new Map(prev);
            next.set(row.assigned_number, row);
            return next;
          });
          if (selectedNumber === row.assigned_number) {
            setSelectedNumber(null);
            setError(`Number #${row.assigned_number} was just claimed by another player.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, selectedNumber]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedPaymentId || !selectedNumber) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await claimNumberAction({
      roundId,
      paymentId: approvedPaymentId,
      displayName,
      number: selectedNumber,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Could not claim number");
      return;
    }

    setSuccessMsg(`Number #${selectedNumber} confirmed for ${displayName.trim()}!`);
    setSelectedNumber(null);
    setDisplayName("");
    router.refresh();
  };

  const numbers = Array.from({ length: capacity }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#999999]">
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-white border border-white/20" />
          Available
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-[#EF3038] border border-white" />
          Selected / Yours
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-[#303030]" />
          Taken
        </span>
      </div>

      {/* 1..100 Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {numbers.map((num) => {
          const taken = takenMap.get(num);
          const isOwnedByMe = ownedSet.has(num);
          const isSelected = selectedNumber === num;

          let stateClass =
            "bg-white text-[#080808] hover:border-[#EF3038] hover:scale-[1.03] cursor-pointer";
          let disabled = false;

          if (isOwnedByMe || isSelected) {
            stateClass =
              "bg-[#EF3038] text-white border-2 border-white shadow-[0_0_16px_rgba(239,48,56,0.4)]";
          } else if (taken) {
            stateClass = "bg-[#303030] text-[#777777] cursor-not-allowed border-transparent";
            disabled = true;
          } else if (!canClaim) {
            stateClass = "bg-white/90 text-[#080808] cursor-default";
            disabled = true;
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              title={taken ? `${taken.display_name} (#${num})` : `Number ${num}`}
              onClick={() => {
                if (!canClaim || taken) return;
                setError(null);
                setSelectedNumber(num);
              }}
              className={cn(
                "relative flex h-12 sm:h-11 items-center justify-center rounded-md border border-white/10 font-display text-sm sm:text-base font-bold tabular-nums transition-all duration-150",
                stateClass
              )}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Confirmation Area */}
      {canClaim ? (
        <form
          onSubmit={handleConfirm}
          className="rounded-xl border border-white/15 bg-[#141414] p-5 space-y-4"
        >
          {error && (
            <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-md border border-[#36B879]/40 bg-[#36B879]/10 px-3.5 py-2.5 text-sm text-[#36B879] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#999999]">
                Number Confirmation
              </p>
              <p className="font-display text-xl font-bold text-white tabular-nums">
                {selectedNumber
                  ? `YOUR SELECTED NUMBER: ${selectedNumber}`
                  : "Tap an available white tile above"}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="displayName">Public Display Name (2–30 chars)</Label>
            <Input
              id="displayName"
              required
              minLength={2}
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. AccraKing, Sarkodie99"
            />
            <p className="mt-1 text-xs text-[#999999]">
              Shown publicly on the live grid and winner reveal. Never uses your MoMo name.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!selectedNumber || displayName.trim().length < 2 || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {selectedNumber
              ? `Lock In Number #${selectedNumber}`
              : "Select a Number to Continue"}
          </Button>
        </form>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4 flex items-center gap-3 text-sm text-[#999999]">
          <Lock className="h-4 w-4 text-[#EF3038] shrink-0" />
          <span>
            {isLive
              ? "Submit a MoMo payment below and wait for admin approval to unlock number selection."
              : "Number selection is currently locked for this round."}
          </span>
        </div>
      )}
    </div>
  );
}

