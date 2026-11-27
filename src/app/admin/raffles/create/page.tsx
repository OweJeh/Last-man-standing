import React from "react";
import { requireAdmin } from "@/lib/auth";
import { RaffleForm } from "@/components/admin/raffle-form";

export default async function CreateRafflePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Create Raffle</h1>
        <p className="text-sm text-[#999999]">
          Configure entry pricing, capacity, owner profit target, and prize allocation.
          New raffles start as Drafts.
        </p>
      </div>
      <RaffleForm />
    </div>
  );
}

