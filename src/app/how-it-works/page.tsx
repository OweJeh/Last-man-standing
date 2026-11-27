import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";

export default async function HowItWorksPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#EF3038]">
            Competition Rules
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold mt-1">
            How Last Man Standing Works
          </h1>
        </div>

        <div className="space-y-6 text-sm sm:text-base text-[#cccccc] leading-relaxed">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-2">
            <h2 className="font-display text-xl font-bold text-white">
              1. Independent Admin-Configured Competitions
            </h2>
            <p>
              Each raffle round has its own entry price, participant capacity (100 by
              default), prize pool, and 1st/2nd/3rd place payouts. Only one raffle
              accepts entries at a time.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-2">
            <h2 className="font-display text-xl font-bold text-white">
              2. Manual MoMo Verification & Number Claim
            </h2>
            <p>
              Participants transfer the exact entry fee via MoMo and submit their
              transaction reference. Once an admin verifies the transfer, the participant
              sets a public display name and claims an available number on the grid (max
              3 entries per account per raffle).
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-2">
            <h2 className="font-display text-xl font-bold text-white">
              3. Five-Stage Grid Elimination
            </h2>
            <p>
              When full, the admin locks the participant snapshot and starts the draw.
              Four grid phases cut 100 → 50 → 25 → 12 → 6 survivors. Phase 5 brings the
              Final Six to the stage, dropping 3 finalists until the Final Three remain
              for 3rd, 2nd, and 1st place.
            </p>
          </div>
        </div>

        <Link href="/raffles">
          <Button size="lg">Browse Raffles</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}

