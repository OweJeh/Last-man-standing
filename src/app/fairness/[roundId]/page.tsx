import React from "react";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { FairnessVerifierClient } from "@/components/raffle/fairness-verifier-client";
import type { RaffleRound } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function FairnessPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  const { data: roundData } = await supabase
    .from("raffle_rounds")
    .select("*")
    .eq("id", roundId)
    .in("status", ["published", "live", "full", "locked", "running", "completed", "archived"])
    .single();

  if (!roundData) notFound();
  const round = roundData as RaffleRound;
  const isCompleted = round.status === "completed" || round.status === "archived";

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#36B879]">
            <ShieldCheck className="h-4 w-4" />
            Public Fairness Audit
          </div>
          <h1 className="font-display text-3xl font-bold">{round.name}</h1>
          <p className="font-mono text-xs text-[#999999]">{round.round_code}</p>
        </div>

        <Card className="bg-[#141414] border-white/10 p-6 space-y-4 text-xs">
          <div>
            <span className="block uppercase text-[#999999] mb-1">Algorithm Version</span>
            <code className="font-mono text-white">
              {round.algorithm_version || "Pending draw start"}
            </code>
          </div>
          <div>
            <span className="block uppercase text-[#999999] mb-1">
              SHA-256 Seed Commitment (Published Before Stage 1)
            </span>
            <code className="font-mono break-all text-white">
              {round.seed_commitment || "Pending draw start"}
            </code>
          </div>
          <div>
            <span className="block uppercase text-[#999999] mb-1">
              Canonical Participant Snapshot Hash
            </span>
            <code className="font-mono break-all text-white">
              {round.snapshot_hash || "Pending draw start"}
            </code>
          </div>
          <div>
            <span className="block uppercase text-[#999999] mb-1">
              Revealed Cryptographic Seed (Published After Completion)
            </span>
            <code className="font-mono break-all text-[#D8B66B]">
              {isCompleted && round.revealed_seed
                ? round.revealed_seed
                : "Hidden until Stage 5 completes"}
            </code>
          </div>
          <div>
            <span className="block uppercase text-[#999999] mb-1">Result Hash</span>
            <code className="font-mono break-all text-white">
              {isCompleted && round.result_hash
                ? round.result_hash
                : "Pending completion"}
            </code>
          </div>
        </Card>

        <FairnessVerifierClient roundId={round.id} isCompleted={isCompleted} />

        <div className="rounded-xl border border-white/10 bg-[#111111] p-5 text-xs text-[#999999] leading-relaxed">
          <strong className="text-white">Future Assurance Note:</strong> For even stronger
          resistance against selective seed replacement prior to commitment publication,
          future versions can incorporate an external randomness beacon (e.g., drand) or
          a multi-party commit-and-reveal ceremony.
        </div>
      </main>

      <Footer />
    </div>
  );
}

