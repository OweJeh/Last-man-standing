"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Share2,
  ShieldCheck,
  Sparkles,
  Radio,
  Trophy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatGhs } from "@/lib/money";
import { GridRandomiserArena } from "./grid-randomiser-arena";
import { FinalSixStage } from "./final-six-stage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PublicParticipant,
  RaffleEvent,
  RaffleRound,
  StageResult,
  Winner,
} from "@/types/database";

interface LiveBroadcastClientProps {
  initialRound: RaffleRound;
  initialParticipants: PublicParticipant[];
  initialStageResults: StageResult[];
  initialWinners: Winner[];
  initialEvents: RaffleEvent[];
  embedded?: boolean;
  compact?: boolean;
  replayStage?: number | null;
  replayKey?: number;
}

export function LiveBroadcastClient({
  initialRound,
  initialParticipants,
  initialStageResults,
  initialWinners,
  initialEvents,
  embedded = false,
  compact = false,
  replayStage = null,
  replayKey = 0,
}: LiveBroadcastClientProps) {
  const [round, setRound] = useState<RaffleRound>(initialRound);
  const [participants, setParticipants] = useState<PublicParticipant[]>(initialParticipants);
  const [stageResults, setStageResults] = useState<StageResult[]>(initialStageResults);
  const [winners, setWinners] = useState<Winner[]>(initialWinners);

  // Keep local state in sync when server props update (e.g., admin control room router.refresh())
  useEffect(() => {
    setRound(initialRound);
  }, [initialRound]);

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  useEffect(() => {
    setStageResults(initialStageResults);
  }, [initialStageResults]);

  useEffect(() => {
    setWinners(initialWinners);
  }, [initialWinners]);
  const seenSeqRef = useRef<Set<number>>(
    new Set(initialEvents.map((e) => e.sequence_number))
  );

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [finalSixDone, setFinalSixDone] = useState(
    initialRound.status === "completed" && initialWinners.length === 3
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) setReducedMotion(true);
    }
  }, []);

  const syncFullState = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${round.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.round) setRound(data.round);
      if (data.participants) setParticipants(data.participants);
      if (data.stageResults) setStageResults(data.stageResults);
      if (data.winners) setWinners(data.winners);
      if (data.events) {
        for (const ev of data.events as RaffleEvent[]) {
          seenSeqRef.current.add(ev.sequence_number);
        }
      }
    } catch {
      // ignore transient network errors
    }
  }, [round.id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-broadcast-${round.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "raffle_rounds",
          filter: `id=eq.${round.id}`,
        },
        (payload) => {
          setRound(payload.new as RaffleRound);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stage_results",
          filter: `round_id=eq.${round.id}`,
        },
        (payload) => {
          const sr = payload.new as StageResult;
          setStageResults((prev) => {
            if (prev.some((x) => x.stage_number === sr.stage_number)) return prev;
            return [...prev, sr].sort((a, b) => a.stage_number - b.stage_number);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "winners",
          filter: `round_id=eq.${round.id}`,
        },
        (payload) => {
          const w = payload.new as Winner;
          setWinners((prev) => {
            if (prev.some((x) => x.position === w.position)) return prev;
            return [...prev, w].sort((a, b) => a.position - b.position);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "raffle_events",
          filter: `round_id=eq.${round.id}`,
        },
        (payload) => {
          const ev = payload.new as RaffleEvent;
          if (seenSeqRef.current.has(ev.sequence_number)) return;
          seenSeqRef.current.add(ev.sequence_number);
          // Re-sync if an event arrived out of order
          syncFullState();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          syncFullState();
        }
      });

    const handleOnline = () => syncFullState();
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      supabase.removeChannel(channel);
    };
  }, [round.id, syncFullState]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator
        .share({
          title: `${round.name} — Last Man Standing Live`,
          text: `Watch ${round.name} live! Prize pool: ${formatGhs(round.prize_pool_pesewas)}`,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const isReplaying = replayStage !== null && replayStage !== undefined;

  useEffect(() => {
    if (isReplaying) {
      setFinalSixDone(false);
    } else {
      setFinalSixDone(
        initialRound.status === "completed" && initialWinners.length === 3
      );
    }
  }, [isReplaying, replayKey, initialRound.status, initialWinners.length]);

  const displayRound: RaffleRound = isReplaying
    ? {
        ...round,
        current_stage: replayStage,
        status: replayStage >= 5 ? "completed" : "running",
      }
    : round;

  const displayStageResults = isReplaying
    ? stageResults.filter((s) => s.stage_number <= replayStage)
    : stageResults;

  const displayWinners = isReplaying
    ? replayStage >= 5
      ? winners
      : []
    : winners;

  const stage4Result = displayStageResults.find((s) => s.stage_number === 4);
  const stage5Result = displayStageResults.find((s) => s.stage_number === 5) ?? null;

  const finalSixParticipants = React.useMemo(() => {
    if (!stage4Result) return [];
    const survSet = new Set(stage4Result.surviving_numbers);
    return participants.filter((p) => survSet.has(p.assigned_number));
  }, [participants, stage4Result]);

  const latestStage = displayStageResults[displayStageResults.length - 1];
  const survivorsCount = latestStage
    ? latestStage.surviving_numbers.length
    : participants.length;

  return (
    <div
      ref={containerRef}
      className={
        embedded
          ? "bg-[#080808] text-white w-full h-full"
          : "min-h-screen bg-[#080808] text-white px-4 py-6 sm:px-6 lg:px-8"
      }
    >
      <div className={compact ? "h-full overflow-hidden" : embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
        {/* Broadcast Header (hidden in compact maximized stream mode) */}
        {!compact && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#141414] p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={displayRound.status === "running" ? "live" : "default"}>
                {displayRound.status === "running" && (
                  <Radio className="h-3 w-3 animate-pulse" />
                )}
                {isReplaying ? `REPLAY · ${displayRound.status.toUpperCase()}` : displayRound.status.toUpperCase()}
              </Badge>
              <span className="font-mono text-xs text-[#999999]">{displayRound.round_code}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {displayRound.name}
            </h1>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              title="Toggle Sound"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#36B879]" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#999999]" />
              )}
              <span className="hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReducedMotion((v) => !v)}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">
                {reducedMotion ? "Reduced Motion" : "Full Motion"}
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
              <Button variant="primary" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {copiedShare ? "Copied!" : "Share"}
              </Button>
            </div>
          </div>
        )}

        {/* Live Telemetry Bar (hidden in compact maximized stream mode) */}
        {!compact && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
            <span className="text-[11px] uppercase tracking-wider text-[#999999]">
              Prize Pool
            </span>
            <p className="font-display text-xl font-bold text-[#D8B66B] tabular-nums mt-0.5">
              {formatGhs(round.prize_pool_pesewas)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
            <span className="text-[11px] uppercase tracking-wider text-[#999999]">
              Entries
            </span>
            <p className="font-display text-xl font-bold text-white tabular-nums mt-0.5">
              {round.confirmed_entries_count} / {round.participant_capacity}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
            <span className="text-[11px] uppercase tracking-wider text-[#999999]">
              Current Stage
            </span>
            <p className="font-display text-xl font-bold text-white tabular-nums mt-0.5">
              {displayRound.current_stage === 0 ? "Pre-Draw" : `Phase ${displayRound.current_stage} / 5`}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
              <span className="text-[11px] uppercase tracking-wider text-[#999999]">
                Survivors
              </span>
              <p className="font-display text-xl font-bold text-[#36B879] tabular-nums mt-0.5">
                {survivorsCount}
              </p>
            </div>
          </div>
        )}

        {/* Main Arena: Phases 1-4 Grid OR Phase 5 Final Six -> Smooth Podium Transition */}
        {displayRound.current_stage >= 5 && finalSixParticipants.length > 0 ? (
          <FinalSixStage
            key={isReplaying ? `replay-f6-${replayKey}` : "live-f6"}
            finalSixParticipants={finalSixParticipants}
            stage5Result={stage5Result}
            winners={displayWinners}
            soundEnabled={soundEnabled}
            reducedMotion={reducedMotion}
            compact={compact}
            showPodiumImmediately={!isReplaying && finalSixDone}
            onComplete={() => setFinalSixDone(true)}
          />
        ) : (
          <GridRandomiserArena
            key={isReplaying ? `replay-grid-${replayKey}` : "live-grid"}
            participants={participants}
            stageResults={displayStageResults}
            currentStage={displayRound.current_stage}
            soundEnabled={soundEnabled}
            reducedMotion={reducedMotion}
            compact={compact}
          />
        )}

        {/* Fairness Commitment & Quick Links (hidden in compact maximized stream mode) */}
        {!compact && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111111] p-4 text-xs text-[#999999]">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-[#36B879]" />
                Cryptographic Draw Commitment
              </div>
              <p className="font-mono break-all">
                {round.seed_commitment
                  ? `SHA-256 Seed Commitment: ${round.seed_commitment}`
                  : "Seed commitment will be published when the admin locks and starts the draw."}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/fairness/${round.id}`}>
                <Button variant="outline" size="sm">
                  Verify Fairness
                </Button>
              </Link>
              <Link href="/winners">
                <Button variant="ghost" size="sm">
                  <Trophy className="h-4 w-4 mr-1" />
                  Past Winners
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

