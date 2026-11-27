import React from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PayoutsClient, type PayoutRow } from "@/components/admin/payouts-client";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("winners")
    .select(
      "*, raffle_rounds(round_code, name), profiles:user_id(full_name, phone, email)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Payout Management
        </h1>
        <p className="text-sm text-[#999999]">
          Winning is tracked separately from prize disbursement. Record MoMo payout
          references here.
        </p>
      </div>

      <PayoutsClient rows={(data ?? []) as unknown as PayoutRow[]} />
    </div>
  );
}

