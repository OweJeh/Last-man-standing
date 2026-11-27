import React from "react";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { emailToPhone } from "@/lib/validations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardProfilePage() {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-2xl sm:text-3xl font-bold">Account Profile</h1>
      <Card className="bg-[#141414] border-white/10 p-6 space-y-4 text-sm">
        <div>
          <span className="text-xs uppercase text-[#999999] block">Full Name</span>
          <span className="font-semibold text-white">{profile?.full_name}</span>
        </div>
        <div>
          <span className="text-xs uppercase text-[#999999] block">Phone Number</span>
          <span className="font-semibold text-white">
            {profile?.phone || emailToPhone(profile?.email ?? "") || "Not set"}
          </span>
        </div>
        <div>
          <span className="text-xs uppercase text-[#999999] block">Role</span>
          <span className="font-mono uppercase text-white">{profile?.role}</span>
        </div>

        <form action={signOutAction} className="pt-4 border-t border-white/10">
          <Button variant="secondary">Sign Out</Button>
        </form>
      </Card>
    </div>
  );
}

