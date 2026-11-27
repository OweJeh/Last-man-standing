"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitPaymentAction } from "@/app/actions/payments";
import { formatGhs } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface PaymentSubmissionFormProps {
  roundId: string;
  userId: string;
  entryFeePesewas: number;
  momoInstructions: string | null;
  defaultMomoNetwork: string;
  defaultMomoNumber: string;
  defaultMomoAccountName: string;
}

export function PaymentSubmissionForm({
  roundId,
  userId,
  entryFeePesewas,
  momoInstructions,
  defaultMomoNetwork,
  defaultMomoNumber,
  defaultMomoAccountName,
}: PaymentSubmissionFormProps) {
  const router = useRouter();
  const [momoProvider, setMomoProvider] = useState<"MTN MoMo" | "Telecel Cash" | "AT Money">(
    "MTN MoMo"
  );
  const [senderPhone, setSenderPhone] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let receiptPath: string | undefined;

    if (receiptFile) {
      // Guard: images only, max 5 MB
      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const MAX_BYTES = 5 * 1024 * 1024;
      if (!ALLOWED_TYPES.includes(receiptFile.type)) {
        setSubmitting(false);
        setError("Receipt must be a JPEG, PNG, WebP, or GIF image.");
        return;
      }
      if (receiptFile.size > MAX_BYTES) {
        setSubmitting(false);
        setError("Receipt image must be smaller than 5 MB.");
        return;
      }

      const supabase = createClient();
      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receiptFile, { upsert: false });

      if (uploadError) {
        setSubmitting(false);
        setError(`Receipt upload failed: ${uploadError.message}`);
        return;
      }
      receiptPath = path;
    }

    const res = await submitPaymentAction({
      roundId,
      momoProvider,
      senderPhone,
      transactionReference,
      receiptPath,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Payment submission failed");
      return;
    }

    setSubmitted(true);
    setSenderPhone("");
    setTransactionReference("");
    setReceiptFile(null);
    router.refresh();
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-[#36B879]/40 bg-[#141414] p-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-[#36B879] mx-auto" />
        <h3 className="font-display text-lg font-bold">Payment Submitted for Review</h3>
        <p className="text-sm text-[#999999]">
          Your MoMo transaction reference is now <strong>PENDING</strong> admin verification.
          Once approved, you can pick your number on the grid.
        </p>
        <Button variant="secondary" onClick={() => setSubmitted(false)}>
          Submit Another Entry Payment
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-5">
      <div className="rounded-lg border border-white/10 bg-[#0d0d0d] p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#EF3038]">
          <Smartphone className="h-3.5 w-3.5" />
          Manual MoMo Transfer Instructions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-sm">
          <div>
            <span className="block text-[11px] uppercase text-[#999999]">Amount</span>
            <span className="font-display font-bold text-white">
              {formatGhs(entryFeePesewas)}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase text-[#999999]">Network / Number</span>
            <span className="font-semibold text-white">
              {defaultMomoNetwork} · {defaultMomoNumber}
            </span>
          </div>
          <div>
            <span className="block text-[11px] uppercase text-[#999999]">Account Name</span>
            <span className="font-semibold text-white">{defaultMomoAccountName}</span>
          </div>
        </div>
        {momoInstructions && (
          <p className="text-xs text-[#999999] pt-2 border-t border-white/10">
            {momoInstructions}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="momoProvider">MoMo Provider</Label>
          <select
            id="momoProvider"
            value={momoProvider}
            onChange={(e) =>
              setMomoProvider(e.target.value as "MTN MoMo" | "Telecel Cash" | "AT Money")
            }
            className="flex h-11 w-full rounded-md border border-white/15 bg-[#111111] px-3.5 text-sm text-white focus:border-[#EF3038] focus:outline-none"
          >
            <option value="MTN MoMo">MTN MoMo</option>
            <option value="Telecel Cash">Telecel Cash</option>
            <option value="AT Money">AT Money</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="senderPhone">Sender Phone Number</Label>
            <Input
              id="senderPhone"
              type="tel"
              required
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="024 123 4567"
            />
          </div>
          <div>
            <Label htmlFor="transactionReference">MoMo Transaction ID</Label>
            <Input
              id="transactionReference"
              required
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g. 49102938471"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="receipt">Payment Screenshot (Optional · max 5 MB)</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-[#111111] px-4 py-3 text-sm text-[#999999] hover:border-white/40 hover:text-white transition-colors">
            <Upload className="h-4 w-4" />
            <span>{receiptFile ? receiptFile.name : "Upload MoMo receipt image (JPEG/PNG)"}</span>
            <input
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit MoMo Payment ({formatGhs(entryFeePesewas)})
        </Button>
      </form>
    </div>
  );
}

