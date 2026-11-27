import { describe, expect, it } from "vitest";
import {
  calculateFinancials,
  formatGhs,
  ghsToPesewas,
  OPTIONAL_RAFFLE_PRESETS,
} from "@/lib/money";

describe("Money & Raffle Financial Calculations", () => {
  it("computes auto 50/30/20 allocation for custom entry price (GHS 100)", () => {
    const res = calculateFinancials({
      entryFeePesewas: ghsToPesewas(100),
      participantCapacity: 100,
      ownerProfitPesewas: ghsToPesewas(2000),
      allocationMethod: "auto_50_30_20",
    });

    expect(res.grossRevenuePesewas).toBe(1000000); // GHS 10,000
    expect(res.prizePoolPesewas).toBe(800000); // GHS 8,000
    expect(res.firstPrizePesewas).toBe(400000); // GHS 4,000
    expect(res.secondPrizePesewas).toBe(240000); // GHS 2,400
    expect(res.thirdPrizePesewas).toBe(160000); // GHS 1,600
  });

  it("matches optional GHS 30/40/50 presets accurately", () => {
    for (const preset of OPTIONAL_RAFFLE_PRESETS) {
      const res = calculateFinancials({
        entryFeePesewas: ghsToPesewas(preset.entryFeeGhs),
        participantCapacity: preset.participantCapacity,
        ownerProfitPesewas: ghsToPesewas(preset.ownerProfitGhs),
        allocationMethod: "auto_50_30_20",
      });
      expect(res.firstPrizePesewas + res.secondPrizePesewas + res.thirdPrizePesewas).toBe(
        res.prizePoolPesewas
      );
    }
  });

  it("validates custom prize allocation must sum to prize pool", () => {
    expect(() =>
      calculateFinancials({
        entryFeePesewas: ghsToPesewas(150),
        participantCapacity: 100,
        ownerProfitPesewas: ghsToPesewas(3000),
        allocationMethod: "custom",
        firstPrizePesewas: ghsToPesewas(5000),
        secondPrizePesewas: ghsToPesewas(3000),
        thirdPrizePesewas: ghsToPesewas(1000), // sums to 9000 instead of 12000
      })
    ).toThrow();
  });

  it("rejects negative owner profit or profit exceeding gross revenue", () => {
    expect(() =>
      calculateFinancials({
        entryFeePesewas: 3000,
        participantCapacity: 100,
        ownerProfitPesewas: -100,
        allocationMethod: "auto_50_30_20",
      })
    ).toThrow();

    expect(() =>
      calculateFinancials({
        entryFeePesewas: 3000,
        participantCapacity: 100,
        ownerProfitPesewas: 350000,
        allocationMethod: "auto_50_30_20",
      })
    ).toThrow();
  });

  it("formats GHS currency cleanly", () => {
    expect(formatGhs(100000)).toBe("GHS 1,000");
    expect(formatGhs(3050)).toBe("GHS 30.50");
  });
});

