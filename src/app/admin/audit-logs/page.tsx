import React from "react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("*, profiles:actor_id(email)")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Audit Logs</h1>
        <p className="text-sm text-[#999999]">
          Immutable append-only trail of all administrative actions.
        </p>
      </div>

      <Card className="bg-[#141414] border-white/10 divide-y divide-white/10">
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-[#999999]">No audit logs recorded.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 space-y-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-white">{log.action}</span>
                <span className="text-[#666666]">{formatDateTime(log.created_at)}</span>
              </div>
              <p className="text-[#999999]">
                Actor: {log.profiles?.email || "System"} · Target: {log.target_type} (
                {log.target_id})
              </p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

