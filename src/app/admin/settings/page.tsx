import React from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updatePlatformSettingsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Platform Settings
        </h1>
        <p className="text-sm text-[#999999]">
          Configure default MoMo receiving account details and entry limits.
        </p>
      </div>

      <Card className="bg-[#141414] border-white/10 p-6">
        <form action={updatePlatformSettingsAction} className="space-y-4">
          <div>
            <Label htmlFor="default_momo_network">Default MoMo Network</Label>
            <Input
              id="default_momo_network"
              name="default_momo_network"
              defaultValue={settings?.default_momo_network ?? "MTN MoMo"}
            />
          </div>
          <div>
            <Label htmlFor="default_momo_number">Default MoMo Number</Label>
            <Input
              id="default_momo_number"
              name="default_momo_number"
              defaultValue={settings?.default_momo_number ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="default_momo_account_name">Account Name</Label>
            <Input
              id="default_momo_account_name"
              name="default_momo_account_name"
              defaultValue={settings?.default_momo_account_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="max_entries_per_user_per_raffle">
              Max Entries Per Account Per Raffle
            </Label>
            <Input
              id="max_entries_per_user_per_raffle"
              name="max_entries_per_user_per_raffle"
              type="number"
              min={1}
              max={10}
              defaultValue={settings?.max_entries_per_user_per_raffle ?? 3}
            />
          </div>
          <Button type="submit">Save Settings</Button>
        </form>
      </Card>
    </div>
  );
}

