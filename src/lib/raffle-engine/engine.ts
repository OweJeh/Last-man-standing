import {
  ALGORITHM_VERSION,
  computeSeedCommitment,
  deterministicFisherYates,
  generateCryptographicSeed,
  sha256Hex,
} from "./crypto";

export interface SnapshotParticipant {
  entryId: string;
  userId: string;
  displayName: string;
  assignedNumber: number;
}

export interface StageDefinition {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  stageName: string;
  announcement: string;
  startingCount: number;
  eliminateCount: number;
  survivingCount: number;
}

export interface PlannedStage {
  stageNumber: 1 | 2 | 3 | 4 | 5;
  stageName: string;
  announcement: string;
  startingCount: number;
  eliminateCount: number;
  survivingCount: number;
  eliminatedNumbers: number[];
  survivingNumbers: number[];
  eliminationSequence: number[];
  eliminatedEntryIds: string[];
}

export interface PlannedWinner {
  position: 1 | 2 | 3;
  entryId: string;
  userId: string;
  displayName: string;
  assignedNumber: number;
}

export interface DrawPlan {
  algorithmVersion: string;
  seedHex: string;
  seedCommitment: string;
  snapshotHash: string;
  resultHash: string;
  canonicalSnapshot: SnapshotParticipant[];
  shuffledOrder: SnapshotParticipant[];
  stages: PlannedStage[];
  winners: PlannedWinner[];
}

export function canonicalizeSnapshot(participants: SnapshotParticipant[]): SnapshotParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.assignedNumber !== b.assignedNumber) {
      return a.assignedNumber - b.assignedNumber;
    }
    return a.entryId.localeCompare(b.entryId);
  });
}

export function computeSnapshotHash(canonicalSnapshot: SnapshotParticipant[]): string {
  const minimal = canonicalSnapshot.map((p) => ({
    entryId: p.entryId,
    displayName: p.displayName,
    assignedNumber: p.assignedNumber,
  }));
  return sha256Hex(JSON.stringify(minimal));
}

export function computeStageDefinitions(capacity: number): StageDefinition[] {
  if (capacity === 100) {
    return [
      {
        stageNumber: 1,
        stageName: "Phase 1 — The Opening Cut",
        announcement: "50 SURVIVORS REMAIN",
        startingCount: 100,
        eliminateCount: 50,
        survivingCount: 50,
      },
      {
        stageNumber: 2,
        stageName: "Phase 2 — Halfway Purge",
        announcement: "25 SURVIVORS REMAIN",
        startingCount: 50,
        eliminateCount: 25,
        survivingCount: 25,
      },
      {
        stageNumber: 3,
        stageName: "Phase 3 — Quarterfinal",
        announcement: "12 SURVIVORS REMAIN",
        startingCount: 25,
        eliminateCount: 13,
        survivingCount: 12,
      },
      {
        stageNumber: 4,
        stageName: "Phase 4 — Semifinal",
        announcement: "6 SURVIVORS REMAIN",
        startingCount: 12,
        eliminateCount: 6,
        survivingCount: 6,
      },
      {
        stageNumber: 5,
        stageName: "Phase 5 — The Final Six",
        announcement: "THE FINAL SIX",
        startingCount: 6,
        eliminateCount: 3,
        survivingCount: 3,
      },
    ];
  }

  if (capacity < 6) {
    throw new Error("Participant capacity must be at least 6");
  }

  // Dynamic 5-stage reduction down to 3 winners for custom capacities
  const s4Surv = 6;
  const s5Surv = 3;
  const s3Surv = Math.max(s4Surv + 1, Math.min(capacity - 2, Math.round(capacity * 0.12)));
  const s2Surv = Math.max(s3Surv + 1, Math.min(capacity - 1, Math.round(capacity * 0.25)));
  const s1Surv = Math.max(s2Surv + 1, Math.min(capacity - 1, Math.round(capacity * 0.5)));

  const counts = [capacity, s1Surv, s2Surv, s3Surv, s4Surv, s5Surv];
  const names = [
    "Phase 1 — The Opening Cut",
    "Phase 2 — Halfway Purge",
    "Phase 3 — Quarterfinal",
    "Phase 4 — Semifinal",
    "Phase 5 — The Final Six",
  ];

  return ([1, 2, 3, 4, 5] as const).map((num, idx) => {
    const startingCount = counts[idx];
    const survivingCount = counts[idx + 1];
    return {
      stageNumber: num,
      stageName: names[idx],
      announcement:
        num === 5 ? "THE FINAL SIX" : `${survivingCount} SURVIVORS REMAIN`,
      startingCount,
      eliminateCount: startingCount - survivingCount,
      survivingCount,
    };
  });
}

export function generateDrawPlan(
  participants: SnapshotParticipant[],
  providedSeedHex?: string
): DrawPlan {
  if (participants.length < 6) {
    throw new Error("At least 6 participants are required for a draw");
  }

  // Validate uniqueness of numbers and entry IDs
  const seenNumbers = new Set<number>();
  const seenIds = new Set<string>();
  for (const p of participants) {
    if (seenNumbers.has(p.assignedNumber)) {
      throw new Error(`Duplicate assigned number detected: ${p.assignedNumber}`);
    }
    if (seenIds.has(p.entryId)) {
      throw new Error(`Duplicate entry ID detected: ${p.entryId}`);
    }
    seenNumbers.add(p.assignedNumber);
    seenIds.add(p.entryId);
  }

  const canonicalSnapshot = canonicalizeSnapshot(participants);
  const seedHex = providedSeedHex ?? generateCryptographicSeed();
  const seedCommitment = computeSeedCommitment(seedHex);
  const snapshotHash = computeSnapshotHash(canonicalSnapshot);

  // Full deterministic shuffle: index 0 is eliminated first, last index is 1st place winner
  const shuffledOrder = deterministicFisherYates(canonicalSnapshot, seedHex);
  const stageDefs = computeStageDefinitions(canonicalSnapshot.length);

  let cursor = 0;
  const stages: PlannedStage[] = stageDefs.map((def) => {
    const eliminatedSlice = shuffledOrder.slice(cursor, cursor + def.eliminateCount);
    cursor += def.eliminateCount;
    const survivingSlice = shuffledOrder.slice(cursor);

    return {
      stageNumber: def.stageNumber,
      stageName: def.stageName,
      announcement: def.announcement,
      startingCount: def.startingCount,
      eliminateCount: def.eliminateCount,
      survivingCount: def.survivingCount,
      eliminatedNumbers: eliminatedSlice.map((p) => p.assignedNumber),
      survivingNumbers: survivingSlice.map((p) => p.assignedNumber),
      eliminationSequence: eliminatedSlice.map((p) => p.assignedNumber),
      eliminatedEntryIds: eliminatedSlice.map((p) => p.entryId),
    };
  });

  // Final three remaining after Stage 5:
  // First of the final 3 = 3rd place, second = 2nd place, last = 1st place
  const finalThree = shuffledOrder.slice(shuffledOrder.length - 3);
  const winners: PlannedWinner[] = [
    {
      position: 3,
      entryId: finalThree[0].entryId,
      userId: finalThree[0].userId,
      displayName: finalThree[0].displayName,
      assignedNumber: finalThree[0].assignedNumber,
    },
    {
      position: 2,
      entryId: finalThree[1].entryId,
      userId: finalThree[1].userId,
      displayName: finalThree[1].displayName,
      assignedNumber: finalThree[1].assignedNumber,
    },
    {
      position: 1,
      entryId: finalThree[2].entryId,
      userId: finalThree[2].userId,
      displayName: finalThree[2].displayName,
      assignedNumber: finalThree[2].assignedNumber,
    },
  ];

  const resultHash = sha256Hex(
    JSON.stringify({
      algorithmVersion: ALGORITHM_VERSION,
      seedCommitment,
      snapshotHash,
      stages: stages.map((s) => ({
        stageNumber: s.stageNumber,
        eliminationSequence: s.eliminationSequence,
      })),
      winners: winners.map((w) => ({
        position: w.position,
        assignedNumber: w.assignedNumber,
        entryId: w.entryId,
      })),
    })
  );

  return {
    algorithmVersion: ALGORITHM_VERSION,
    seedHex,
    seedCommitment,
    snapshotHash,
    resultHash,
    canonicalSnapshot,
    shuffledOrder,
    stages,
    winners,
  };
}

export interface VerificationInput {
  seedHex: string;
  seedCommitment: string;
  snapshot: SnapshotParticipant[];
  snapshotHash: string;
  algorithmVersion: string;
  expectedResultHash: string;
}

export interface VerificationResult {
  valid: boolean;
  commitmentMatches: boolean;
  snapshotMatches: boolean;
  resultMatches: boolean;
  algorithmMatches: boolean;
  computedSeedCommitment: string;
  computedSnapshotHash: string;
  computedResultHash: string;
  stages: PlannedStage[];
  winners: PlannedWinner[];
}

export function verifyDraw(input: VerificationInput): VerificationResult {
  const algorithmMatches = input.algorithmVersion === ALGORITHM_VERSION;
  const plan = generateDrawPlan(input.snapshot, input.seedHex);

  const commitmentMatches = plan.seedCommitment === input.seedCommitment;
  const snapshotMatches = plan.snapshotHash === input.snapshotHash;
  const resultMatches = plan.resultHash === input.expectedResultHash;

  return {
    valid: algorithmMatches && commitmentMatches && snapshotMatches && resultMatches,
    commitmentMatches,
    snapshotMatches,
    resultMatches,
    algorithmMatches,
    computedSeedCommitment: plan.seedCommitment,
    computedSnapshotHash: plan.snapshotHash,
    computedResultHash: plan.resultHash,
    stages: plan.stages,
    winners: plan.winners,
  };
}

