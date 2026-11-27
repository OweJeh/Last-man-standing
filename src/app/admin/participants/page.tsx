import React from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  AdminParticipantsClient,
  type AdminEntryRow,
  type AdminProfileRow,
} from "@/components/admin/participants-client";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const [
    { data: entriesData, error: entriesError },
    { data: profilesData, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "*, profiles:user_id(full_name, email, phone), raffle_rounds(round_code, name), payment_submissions(status, transaction_reference)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const errorMsg = entriesError?.message || profilesError?.message;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Participants</h1>
        <p className="text-sm text-[#999999]">
          Confirmed entries across rounds and registered participant accounts.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-sm text-[#FF2020]">
          Failed to load participants: {errorMsg}
        </div>
      )}

      <AdminParticipantsClient
        entries={(entriesData ?? []) as unknown as AdminEntryRow[]}
        profiles={(profilesData ?? []) as unknown as AdminProfileRow[]}
      />
    </div>
  );
}
