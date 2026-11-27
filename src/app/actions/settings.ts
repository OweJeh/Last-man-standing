"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function updatePlatformSettingsAction(formData: FormData) {
  const admin = await assertAdminSession();
  const supabase = createAdminSupabaseClient();

  const defaultMomoNetwork = String(formData.get("default_momo_network") || "MTN MoMo");
  const defaultMomoNumber = String(formData.get("default_momo_number") || "");
  const defaultMomoAccountName = String(
    formData.get("default_momo_account_name") || ""
  );
  const maxEntries = Number(formData.get("max_entries_per_user_per_raffle") || 3);

  await supabase
    .from("platform_settings")
    .update({
      default_momo_network: defaultMomoNetwork,
      default_momo_number: defaultMomoNumber,
      default_momo_account_name: defaultMomoAccountName,
      max_entries_per_user_per_raffle: Math.min(10, Math.max(1, maxEntries)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "PLATFORM_SETTINGS_UPDATED",
    target_type: "platform_settings",
    target_id: "1",
    new_value: { defaultMomoNetwork, defaultMomoNumber, maxEntries },
  });

  revalidatePath("/admin/settings");
}

