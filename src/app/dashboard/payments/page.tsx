import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPaymentsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("payment_submissions")
    .select("*, raffle_rounds(id, round_code, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const payments = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold">MoMo Payments</h1>

      {payments.length === 0 ? (
        <Card className="bg-[#141414] border-white/10 p-8 text-center text-sm text-[#999999]">
          No payment submissions yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const round = p.raffle_rounds as {
              id: string;
              round_code: string;
              name: string;
            } | null;

            return (
              <Card
                key={p.id}
                className="bg-[#141414] border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                    <span className="font-mono text-xs text-[#999999]">
                      Ref: {p.transaction_reference}
                    </span>
                  </div>
                  <p className="font-display font-bold">
                    {round?.name} · {formatGhs(p.amount_pesewas)}
                  </p>
                  <p className="text-xs text-[#999999]">
                    {p.momo_provider} ({p.sender_phone}) · {formatDateTime(p.created_at)}
                  </p>
                  {p.admin_notes && (
                    <p className="text-xs text-[#EF3038]">Note: {p.admin_notes}</p>
                  )}
                </div>

                {p.status === "approved" && (
                  <Link href={`/raffles/${p.round_id}`}>
                    <Button variant="success" size="sm">
                      Claim Number
                    </Button>
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

