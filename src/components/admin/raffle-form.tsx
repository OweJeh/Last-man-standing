"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  OPTIONAL_RAFFLE_PRESETS,
  calculateFinancials,
  formatGhs,
  ghsToPesewas,
} from "@/lib/money";
import { computeStageDefinitions, type StageDefinition } from "@/lib/raffle-engine/engine";
import { createRaffleAction, updateDraftRaffleAction } from "@/app/actions/admin-raffles";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { RaffleRound } from "@/types/database";

interface RaffleFormProps {
  existingDraft?: RaffleRound;
}

export function RaffleForm({ existingDraft }: RaffleFormProps) {
  const router = useRouter();
  const [name, setName] = useState(existingDraft?.name ?? "");
  const [roundCode, setRoundCode] = useState(
    existingDraft?.round_code ?? `LMS-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [description, setDescription] = useState(existingDraft?.description ?? "");
  const [entryFeeGhs, setEntryFeeGhs] = useState(
    existingDraft ? existingDraft.entry_fee_pesewas / 100 : 100
  );
  const [participantCapacity, setParticipantCapacity] = useState(
    existingDraft?.participant_capacity ?? 100
  );
  const [numStages, setNumStages] = useState<3 | 4 | 5>(
    ((existingDraft?.num_stages as 3 | 4 | 5) ?? 5)
  );
  const [ownerProfitGhs, setOwnerProfitGhs] = useState(
    existingDraft ? existingDraft.owner_profit_pesewas / 100 : 2000
  );
  const [allocationMethod, setAllocationMethod] = useState<"auto_50_30_20" | "custom">(
    existingDraft?.allocation_method ?? "auto_50_30_20"
  );
  const [firstPrizeGhs, setFirstPrizeGhs] = useState(
    existingDraft ? existingDraft.first_prize_pesewas / 100 : 4000
  );
  const [secondPrizeGhs, setSecondPrizeGhs] = useState(
    existingDraft ? existingDraft.second_prize_pesewas / 100 : 2400
  );
  const [thirdPrizeGhs, setThirdPrizeGhs] = useState(
    existingDraft ? existingDraft.third_prize_pesewas / 100 : 1600
  );
  const [momoInstructions, setMomoInstructions] = useState(
    existingDraft?.momo_instructions ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let preview: ReturnType<typeof calculateFinancials> | null = null;
  let previewError: string | null = null;

  try {
    preview = calculateFinancials({
      entryFeePesewas: ghsToPesewas(Number(entryFeeGhs) || 0),
      participantCapacity: Number(participantCapacity) || 0,
      ownerProfitPesewas: ghsToPesewas(Number(ownerProfitGhs) || 0),
      allocationMethod,
      firstPrizePesewas: ghsToPesewas(Number(firstPrizeGhs) || 0),
      secondPrizePesewas: ghsToPesewas(Number(secondPrizeGhs) || 0),
      thirdPrizePesewas: ghsToPesewas(Number(thirdPrizeGhs) || 0),
    });
  } catch (err) {
    previewError = err instanceof Error ? err.message : "Invalid financial config";
  }

  let stagePreview: StageDefinition[] | null = null;
  let stagePreviewError: string | null = null;
  try {
    stagePreview = computeStageDefinitions(Number(participantCapacity) || 0, numStages);
  } catch (err) {
    stagePreviewError = err instanceof Error ? err.message : "Invalid stage configuration";
  }

  const applyPreset = (presetId: string) => {
    const preset = OPTIONAL_RAFFLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.name);
    setEntryFeeGhs(preset.entryFeeGhs);
    setOwnerProfitGhs(preset.ownerProfitGhs);
    setParticipantCapacity(preset.participantCapacity);
    setNumStages(5);
    setAllocationMethod("auto_50_30_20");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name,
      roundCode: roundCode.toUpperCase(),
      description,
      entryFeeGhs,
      participantCapacity,
      numStages,
      ownerProfitGhs,
      allocationMethod,
      firstPrizeGhs: allocationMethod === "custom" ? firstPrizeGhs : undefined,
      secondPrizeGhs: allocationMethod === "custom" ? secondPrizeGhs : undefined,
      thirdPrizeGhs: allocationMethod === "custom" ? thirdPrizeGhs : undefined,
      momoInstructions,
    };

    const res = existingDraft
      ? await updateDraftRaffleAction(existingDraft.id, payload)
      : await createRaffleAction(payload);

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Failed to save raffle");
      return;
    }

    router.push("/admin/raffles");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {!existingDraft && (
        <div className="space-y-2">
          <Label>Optional Quick Presets (Not Mandatory)</Label>
          <div className="flex flex-wrap gap-2">
            {OPTIONAL_RAFFLE_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-sm text-[#FF2020]">
          {error}
        </div>
      )}

      <Card className="bg-[#141414] border-white/10 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Raffle Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grand Friday GHS 100 Arena"
            />
          </div>
          <div>
            <Label htmlFor="roundCode">Round Code</Label>
            <Input
              id="roundCode"
              required
              value={roundCode}
              onChange={(e) => setRoundCode(e.target.value.toUpperCase())}
              placeholder="LMS-1001"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Competition details and schedule..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="entryFeeGhs">Entry Price (GHS)</Label>
            <Input
              id="entryFeeGhs"
              type="number"
              step="0.01"
              min="1"
              required
              value={entryFeeGhs}
              onChange={(e) => setEntryFeeGhs(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="capacity">Participant Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="8"
              max="1000"
              required
              value={participantCapacity}
              onChange={(e) => setParticipantCapacity(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="numStages">Elimination Rounds (Stages)</Label>
            <select
              id="numStages"
              value={numStages}
              onChange={(e) => setNumStages(Number(e.target.value) as 3 | 4 | 5)}
              className="flex h-11 w-full rounded-md border border-white/15 bg-[#111111] px-3.5 text-sm text-white"
            >
              <option value={5}>5 Stages (4 Cuts + Final Six)</option>
              <option value={4}>4 Stages (3 Cuts + Final Six)</option>
              <option value={3}>3 Stages (2 Cuts + Final Six)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ownerProfitGhs">Owner Profit Target (GHS)</Label>
            <Input
              id="ownerProfitGhs"
              type="number"
              step="0.01"
              min="0"
              required
              value={ownerProfitGhs}
              onChange={(e) => setOwnerProfitGhs(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Live Stage Breakdown Preview */}
        <div className="rounded-lg border border-white/10 bg-[#0d0d0d] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#999999]">
              Elimination Round Plan ({numStages} Stages · Final Six Always Last)
            </span>
          </div>
          {stagePreviewError ? (
            <p className="text-xs text-[#FF2020]">{stagePreviewError}</p>
          ) : (
            stagePreview && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {stagePreview.map((s) => (
                  <div
                    key={s.stageNumber}
                    className="rounded-md border border-white/10 bg-[#141414] px-2.5 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-[#999999]">
                        Stage {s.stageNumber}
                      </span>
                      {s.stageNumber === numStages && (
                        <span className="text-[10px] font-semibold text-[#D8B66B]">
                          Final Six
                        </span>
                      )}
                    </div>
                    <p className="font-display font-bold text-white mt-0.5 tabular-nums">
                      {s.startingCount} → {s.survivingCount}
                    </p>
                    <p className="text-[11px] text-[#EF3038] tabular-nums">
                      -{s.eliminateCount} out
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div>
          <Label htmlFor="allocationMethod">Prize Allocation Method</Label>
          <select
            id="allocationMethod"
            value={allocationMethod}
            onChange={(e) =>
              setAllocationMethod(e.target.value as "auto_50_30_20" | "custom")
            }
            className="flex h-11 w-full rounded-md border border-white/15 bg-[#111111] px-3.5 text-sm text-white"
          >
            <option value="auto_50_30_20">Automatic (50% / 30% / 20% of Prize Pool)</option>
            <option value="custom">Custom Prize Amounts</option>
          </select>
        </div>

        {allocationMethod === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstPrizeGhs">1st Place (GHS)</Label>
              <Input
                id="firstPrizeGhs"
                type="number"
                step="0.01"
                min="0"
                value={firstPrizeGhs}
                onChange={(e) => setFirstPrizeGhs(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="secondPrizeGhs">2nd Place (GHS)</Label>
              <Input
                id="secondPrizeGhs"
                type="number"
                step="0.01"
                min="0"
                value={secondPrizeGhs}
                onChange={(e) => setSecondPrizeGhs(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="thirdPrizeGhs">3rd Place (GHS)</Label>
              <Input
                id="thirdPrizeGhs"
                type="number"
                step="0.01"
                min="0"
                value={thirdPrizeGhs}
                onChange={(e) => setThirdPrizeGhs(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="momoInstructions">MoMo Payment Instructions</Label>
          <Textarea
            id="momoInstructions"
            value={momoInstructions}
            onChange={(e) => setMomoInstructions(e.target.value)}
            placeholder="Use your email or round code as MoMo reference..."
          />
        </div>
      </Card>

      {/* Financial Preview */}
      <Card className="bg-[#111111] border-white/10 p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#999999] mb-3">
          Calculated Financial Summary (Integer Pesewas Validated)
        </h3>
        {previewError ? (
          <p className="text-sm text-[#FF2020]">{previewError}</p>
        ) : (
          preview && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <span className="text-xs text-[#999999] block">Gross Revenue</span>
                <span className="font-display font-bold tabular-nums">
                  {formatGhs(preview.grossRevenuePesewas)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#999999] block">Owner Profit</span>
                <span className="font-display font-bold tabular-nums">
                  {formatGhs(preview.ownerProfitPesewas)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#999999] block">Prize Pool</span>
                <span className="font-display font-bold text-[#D8B66B] tabular-nums">
                  {formatGhs(preview.prizePoolPesewas)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#999999] block">1st Place</span>
                <span className="font-display font-bold tabular-nums">
                  {formatGhs(preview.firstPrizePesewas)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#999999] block">2nd / 3rd</span>
                <span className="font-display font-bold tabular-nums">
                  {formatGhs(preview.secondPrizePesewas)} /{" "}
                  {formatGhs(preview.thirdPrizePesewas)}
                </span>
              </div>
            </div>
          )
        )}
      </Card>

      <Button type="submit" size="lg" disabled={submitting || Boolean(previewError) || Boolean(stagePreviewError)}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {existingDraft ? "Save Draft Changes" : "Create Draft Raffle"}
      </Button>
    </form>
  );
}

