export type PrizeAllocationMethod = "auto_50_30_20" | "custom";

export interface FinancialConfigInput {
  entryFeePesewas: number;
  participantCapacity: number;
  ownerProfitPesewas: number;
  allocationMethod: PrizeAllocationMethod;
  firstPrizePesewas?: number;
  secondPrizePesewas?: number;
  thirdPrizePesewas?: number;
}

export interface CalculatedFinancials {
  entryFeePesewas: number;
  participantCapacity: number;
  grossRevenuePesewas: number;
  ownerProfitPesewas: number;
  prizePoolPesewas: number;
  firstPrizePesewas: number;
  secondPrizePesewas: number;
  thirdPrizePesewas: number;
  allocationMethod: PrizeAllocationMethod;
}

export function ghsToPesewas(ghs: number): number {
  if (!Number.isFinite(ghs)) {
    throw new Error("Invalid GHS amount");
  }
  return Math.round(ghs * 100);
}

export function pesewasToGhs(pesewas: number): number {
  return pesewas / 100;
}

export function formatGhs(pesewas: number, options?: { showDecimals?: boolean }): string {
  const ghs = pesewas / 100;
  const hasRemainder = pesewas % 100 !== 0;
  const showDecimals = options?.showDecimals ?? hasRemainder;

  return `GHS ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(ghs)}`;
}

export function calculateFinancials(input: FinancialConfigInput): CalculatedFinancials {
  const { entryFeePesewas, participantCapacity, ownerProfitPesewas, allocationMethod } = input;

  if (!Number.isInteger(entryFeePesewas) || entryFeePesewas <= 0) {
    throw new Error("Entry fee must be a positive integer in pesewas");
  }
  if (!Number.isInteger(participantCapacity) || participantCapacity < 6) {
    throw new Error("Participant capacity must be an integer of at least 6");
  }
  if (!Number.isInteger(ownerProfitPesewas) || ownerProfitPesewas < 0) {
    throw new Error("Owner profit cannot be negative");
  }

  const grossRevenuePesewas = entryFeePesewas * participantCapacity;
  if (ownerProfitPesewas > grossRevenuePesewas) {
    throw new Error("Owner profit cannot exceed gross revenue");
  }

  const prizePoolPesewas = grossRevenuePesewas - ownerProfitPesewas;

  let firstPrizePesewas: number;
  let secondPrizePesewas: number;
  let thirdPrizePesewas: number;

  if (allocationMethod === "auto_50_30_20") {
    firstPrizePesewas = Math.floor((prizePoolPesewas * 50) / 100);
    secondPrizePesewas = Math.floor((prizePoolPesewas * 30) / 100);
    thirdPrizePesewas = prizePoolPesewas - firstPrizePesewas - secondPrizePesewas;
  } else {
    firstPrizePesewas = input.firstPrizePesewas ?? -1;
    secondPrizePesewas = input.secondPrizePesewas ?? -1;
    thirdPrizePesewas = input.thirdPrizePesewas ?? -1;

    if (
      !Number.isInteger(firstPrizePesewas) ||
      !Number.isInteger(secondPrizePesewas) ||
      !Number.isInteger(thirdPrizePesewas) ||
      firstPrizePesewas < 0 ||
      secondPrizePesewas < 0 ||
      thirdPrizePesewas < 0
    ) {
      throw new Error("All custom prize amounts must be non-negative integers in pesewas");
    }

    if (firstPrizePesewas + secondPrizePesewas + thirdPrizePesewas !== prizePoolPesewas) {
      throw new Error(
        `Custom prizes (${formatGhs(firstPrizePesewas + secondPrizePesewas + thirdPrizePesewas)}) must equal prize pool (${formatGhs(prizePoolPesewas)})`
      );
    }
  }

  return {
    entryFeePesewas,
    participantCapacity,
    grossRevenuePesewas,
    ownerProfitPesewas,
    prizePoolPesewas,
    firstPrizePesewas,
    secondPrizePesewas,
    thirdPrizePesewas,
    allocationMethod,
  };
}

export interface RafflePreset {
  id: string;
  label: string;
  name: string;
  entryFeeGhs: number;
  ownerProfitGhs: number;
  participantCapacity: number;
}

export const OPTIONAL_RAFFLE_PRESETS: RafflePreset[] = [
  {
    id: "preset-30",
    label: "GHS 30 Classic",
    name: "GHS 30 Arena",
    entryFeeGhs: 30,
    ownerProfitGhs: 1000,
    participantCapacity: 100,
  },
  {
    id: "preset-40",
    label: "GHS 40 Contender",
    name: "GHS 40 Arena",
    entryFeeGhs: 40,
    ownerProfitGhs: 1000,
    participantCapacity: 100,
  },
  {
    id: "preset-50",
    label: "GHS 50 High Stakes",
    name: "GHS 50 Arena",
    entryFeeGhs: 50,
    ownerProfitGhs: 1000,
    participantCapacity: 100,
  },
];

