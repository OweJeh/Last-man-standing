import React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentProfile } from "@/lib/auth";

export default async function ResponsiblePlayPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-6">
        <h1 className="font-display text-3xl font-bold">Responsible Play</h1>
        <div className="space-y-4 text-sm text-[#999999] leading-relaxed">
          <p>
            Last Man Standing enforces a strict maximum of three entries per account per
            raffle to encourage fair, accessible competition.
          </p>
          <p>
            Only participate with amounts you can afford. If you need assistance or wish
            to pause your account, please reach out via our contact page.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

