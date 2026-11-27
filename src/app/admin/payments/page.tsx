import React from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { type AdminPaymentRow } from "@/components/admin/payment-review-client";
import { PaymentReviewRealtime } from "@/components/admin/payment-review-realtime";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("payment_submissions")
    .select("*, profiles:user_id(full_name, email), raffle_rounds(name, round_code)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          MoMo Payment Approvals
        </h1>
        <p className="text-sm text-[#999999]">
          Verify incoming MoMo transfers against transaction records before unlocking
          number selection. New submissions appear automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-sm text-[#FF2020]">
          Failed to load payments: {error.message}
        </div>
      )}

      <PaymentReviewRealtime payments={(data ?? []) as unknown as AdminPaymentRow[]} />
    </div>
  );
}

