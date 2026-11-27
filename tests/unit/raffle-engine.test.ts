import { describe, expect, it } from "vitest";
import {
  ALGORITHM_VERSION,
  decryptSeed,
  encryptSeed,
  generateCryptographicSeed,
  generateDrawPlan,
  verifyDraw,
  type SnapshotParticipant,
} from "@/lib/raffle-engine";

function makeParticipants(count = 100): SnapshotParticipant[] {
  return Array.from({ length: count }, (_, idx) => ({
    entryId: `00000000-0000-4000-8000-${String(idx + 1).padStart(12, "0")}`,
    userId: `11111111-1111-4111-8111-${String((idx % 40) + 1).padStart(12, "0")}`,
    displayName: `Player_${idx + 1}`,
    assignedNumber: idx + 1,
  }));
}

describe("Cryptographic Raffle Engine", () => {
  it("generates exact 5-stage elimination counts for 100 participants", () => {
    const participants = makeParticipants(100);
    const plan = generateDrawPlan(participants);

    expect(plan.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(plan.stages).toHaveLength(5);

    expect(plan.stages[0].eliminatedNumbers).toHaveLength(50);
    expect(plan.stages[0].survivingNumbers).toHaveLength(50);

    expect(plan.stages[1].eliminatedNumbers).toHaveLength(25);
    expect(plan.stages[1].survivingNumbers).toHaveLength(25);

    expect(plan.stages[2].eliminatedNumbers).toHaveLength(13);
    expect(plan.stages[2].survivingNumbers).toHaveLength(12);

    expect(plan.stages[3].eliminatedNumbers).toHaveLength(6);
    expect(plan.stages[3].survivingNumbers).toHaveLength(6);

    expect(plan.stages[4].eliminatedNumbers).toHaveLength(3);
    expect(plan.stages[4].survivingNumbers).toHaveLength(3);

    // 97 eliminated + 3 winners = 100 unique numbers
    const allEliminated = plan.stages.flatMap((s) => s.eliminatedNumbers);
    const winnerNums = plan.winners.map((w) => w.assignedNumber);
    const combined = new Set([...allEliminated, ...winnerNums]);
    expect(allEliminated).toHaveLength(97);
    expect(winnerNums).toHaveLength(3);
    expect(combined.size).toBe(100);

    // Winners ranked 3rd, 2nd, 1st matching final surviving order
    expect(plan.winners.map((w) => w.position)).toEqual([3, 2, 1]);
  });

  it("deterministically verifies a completed draw and rejects tampering", () => {
    const participants = makeParticipants(100);
    const plan = generateDrawPlan(participants);

    const ok = verifyDraw({
      seedHex: plan.seedHex,
      seedCommitment: plan.seedCommitment,
      snapshot: participants,
      snapshotHash: plan.snapshotHash,
      algorithmVersion: plan.algorithmVersion,
      expectedResultHash: plan.resultHash,
    });
    expect(ok.valid).toBe(true);
    expect(ok.commitmentMatches).toBe(true);
    expect(ok.snapshotMatches).toBe(true);
    expect(ok.resultMatches).toBe(true);

    // Tamper with seed
    const badSeed = verifyDraw({
      seedHex: generateCryptographicSeed(),
      seedCommitment: plan.seedCommitment,
      snapshot: participants,
      snapshotHash: plan.snapshotHash,
      algorithmVersion: plan.algorithmVersion,
      expectedResultHash: plan.resultHash,
    });
    expect(badSeed.valid).toBe(false);
    expect(badSeed.commitmentMatches).toBe(false);
  });

  it("rejects duplicate participant numbers", () => {
    const participants = makeParticipants(10);
    participants[5].assignedNumber = 1;
    expect(() => generateDrawPlan(participants)).toThrow(/Duplicate assigned number/);
  });

  it("encrypts and decrypts the cryptographic seed with AES-256-GCM", () => {
    const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const seed = generateCryptographicSeed();
    const cipherText = encryptSeed(seed, key);
    expect(cipherText).not.toContain(seed);
    expect(decryptSeed(cipherText, key)).toBe(seed);
  });
});

