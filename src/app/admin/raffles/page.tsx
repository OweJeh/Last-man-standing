import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { AdminRafflesListClient } from "@/components/admin/admin-raffles-list-client";
import type { RaffleRound } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminRafflesPage() {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("raffle_rounds")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Raffles</h1>
          <p className="text-sm text-[#999999]">
            Create, publish, activate, and manage competition rounds.
          </p>
        </div>
        <Link href="/admin/raffles/create">
          <Button>
            <Plus className="h-4 w-4" />
            Create Raffle
          </Button>
        </Link>
      </div>

      <AdminRafflesListClient rounds={(data ?? []) as RaffleRound[]} />
    </div>
  );
}

