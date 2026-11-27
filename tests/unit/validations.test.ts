import { describe, expect, it } from "vitest";
import {
  claimNumberSchema,
  createRaffleSchema,
  paymentSubmissionSchema,
} from "@/lib/validations";

describe("Zod Input Validations", () => {
  it("trims display names and enforces 2..30 characters", () => {
    const valid = claimNumberSchema.safeParse({
      roundId: "00000000-0000-4000-8000-000000000001",
      paymentId: "00000000-0000-4000-8000-000000000002",
      displayName: "   Accra   King  ",
      number: 27,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.displayName).toBe("Accra King");
    }

    const tooShort = claimNumberSchema.safeParse({
      roundId: "00000000-0000-4000-8000-000000000001",
      paymentId: "00000000-0000-4000-8000-000000000002",
      displayName: " A ",
      number: 27,
    });
    expect(tooShort.success).toBe(false);
  });

  it("validates custom raffle creation with arbitrary GHS entry price", () => {
    const res = createRaffleSchema.safeParse({
      name: "VIP GHS 200 Arena",
      roundCode: "LMS-VIP-200",
      entryFeeGhs: 200,
      participantCapacity: 100,
      ownerProfitGhs: 5000,
      allocationMethod: "auto_50_30_20",
    });
    expect(res.success).toBe(true);
  });

  it("validates MoMo payment submission fields", () => {
    const res = paymentSubmissionSchema.safeParse({
      roundId: "00000000-0000-4000-8000-000000000001",
      momoProvider: "MTN MoMo",
      senderPhone: "0241234567",
      transactionReference: "TXN99887766",
    });
    expect(res.success).toBe(true);
  });
});

