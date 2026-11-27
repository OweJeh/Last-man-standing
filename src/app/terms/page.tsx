import React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentProfile } from "@/lib/auth";

export default async function TermsPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-6">
        <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
        <div className="space-y-4 text-sm text-[#999999] leading-relaxed">
          <p>
            Participants must be 18 years or older to enter any Last Man Standing
            competition. Each registered account is limited to a maximum of three (3)
            confirmed entries per raffle round.
          </p>
          <p>
            All MoMo payments are manually verified before number selection is unlocked.
            Confirmed numbers cannot be changed or transferred after lock-in.
          </p>
          <p>
            Draw results are generated deterministically using a committed cryptographic
            seed and cannot be altered once started.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

