import React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentProfile } from "@/lib/auth";

export default async function PrivacyPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-6">
        <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
        <div className="space-y-4 text-sm text-[#999999] leading-relaxed">
          <p>
            We collect your full name, phone number, and MoMo transaction reference
            solely to administer entries, send draw notifications, and process prize
            payouts.
          </p>
          <p>
            Your MoMo account name and phone number are never displayed publicly. Only
            your chosen public display name and assigned number appear on the live grid
            and winner reveal.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

