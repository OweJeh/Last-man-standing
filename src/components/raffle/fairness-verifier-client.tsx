"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FairnessVerifierClientProps {
  roundId: string;
  isCompleted: boolean;
}

interface VerifyResponse {
  valid: boolean;
  commitmentMatches: boolean;
  snapshotMatches: boolean;
  resultMatches: boolean;
  algorithmMatches: boolean;
  computedSeedCommitment: string;
  computedSnapshotHash: string;
  computedResultHash: string;
  error?: string;
}

export function FairnessVerifierClient({
  roundId,
  isCompleted,
}: FairnessVerifierClientProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const runVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fairness/${roundId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  if (!isCompleted) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#141414] p-5 text-sm text-[#999999]">
        Seed revelation and deterministic reproduction become available once Stage 5
        completes.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold">
            Independent Deterministic Reproduction
          </h3>
          <p className="text-xs text-[#999999] mt-0.5">
            Re-runs the HMAC-SHA256 Fisher-Yates shuffle from the revealed seed and
            canonical participant snapshot.
          </p>
        </div>
        <Button onClick={runVerification} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Run Verification
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-white/10 bg-[#0d0d0d] p-4 space-y-3 text-xs">
          {result.error ? (
            <p className="text-[#FF2020]">{result.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-bold">
                {result.valid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-[#36B879]" />
                    <span className="text-[#36B879]">
                      VERIFIED: All cryptographic checks passed!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-[#FF2020]" />
                    <span className="text-[#FF2020]">VERIFICATION MISMATCH</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div>Seed Commitment Match: {result.commitmentMatches ? "PASS" : "FAIL"}</div>
                <div>Snapshot Hash Match: {result.snapshotMatches ? "PASS" : "FAIL"}</div>
                <div>Result Hash Match: {result.resultMatches ? "PASS" : "FAIL"}</div>
                <div>Algorithm Version Match: {result.algorithmMatches ? "PASS" : "FAIL"}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

