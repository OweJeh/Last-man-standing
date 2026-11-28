"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";
import { reviewPaymentAction } from "@/app/actions/payments";
import { emailToPhone } from "@/lib/validations";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface AdminPaymentRow {
  id: string;
  round_id: string;
  amount_pesewas: number;
  momo_provider: string;
  sender_phone: string;
  transaction_reference: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
  raffle_rounds?: { name: string; round_code: string } | null;
}

export function PaymentReviewClient({
  payments,
}: {
  payments: AdminPaymentRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "consumed">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    if (p.status !== tab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.transaction_reference.toLowerCase().includes(q) ||
      p.sender_phone.toLowerCase().includes(q) ||
      emailToPhone(p.profiles?.email ?? "").toLowerCase().includes(q) ||
      (p.profiles?.full_name ?? "").toLowerCase().includes(q)
    );
  });

  const handleReview = async (paymentId: string, decision: "approve" | "reject") => {
    setBusyId(paymentId);
    setError(null);
    const res = await reviewPaymentAction({
      paymentId,
      decision,
      adminNotes: notesById[paymentId] || undefined,
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error || "Failed to review payment");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">

      {error && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-sm text-[#FF2020]">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "consumed"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTab(t)}
            >
              {t.toUpperCase()} ({payments.filter((p) => p.status === t).length})
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-[#666666] absolute left-3 top-3.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, phone, email..."
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
          No {tab} payments found.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="bg-[#141414] border-white/10 p-5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        p.status === "approved"
                          ? "success"
                          : p.status === "rejected"
                          ? "danger"
                          : p.status === "consumed"
                          ? "gold"
                          : "default"
                      }
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs text-white font-bold">
                      Ref: {p.transaction_reference}
                    </span>
                    <span className="text-xs text-[#999999]">
                      {p.raffle_rounds?.round_code}
                    </span>
                  </div>
                  <p className="font-display text-lg font-bold">
                    {formatGhs(p.amount_pesewas)} · {p.momo_provider} ({p.sender_phone})
                  </p>
                  <p className="text-xs text-[#999999]">
                    {p.profiles?.full_name} ({emailToPhone(p.profiles?.email ?? "")}) ·{" "}
                    {formatDateTime(p.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.status === "pending" && (
                    <>
                      <Input
                        placeholder="Admin note (optional)"
                        value={notesById[p.id] ?? ""}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="h-9 w-44 text-xs"
                      />
                      <Button
                        variant="success"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => handleReview(p.id, "approve")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => handleReview(p.id, "reject")}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

