import { z } from "zod";
import { sanitizeDisplayName } from "./utils";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(80),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(9, "Enter a valid phone number")
      .max(20, "Phone number is too long"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createRaffleSchema = z.object({
  name: z.string().trim().min(3, "Raffle name is required").max(100),
  roundCode: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens only"),
  description: z.string().trim().max(500).optional(),
  entryFeeGhs: z.coerce.number().positive("Entry price must be greater than 0"),
  participantCapacity: z.coerce.number().int().min(6).max(1000).default(100),
  ownerProfitGhs: z.coerce.number().min(0, "Owner profit cannot be negative"),
  allocationMethod: z.enum(["auto_50_30_20", "custom"]).default("auto_50_30_20"),
  firstPrizeGhs: z.coerce.number().min(0).optional(),
  secondPrizeGhs: z.coerce.number().min(0).optional(),
  thirdPrizeGhs: z.coerce.number().min(0).optional(),
  momoInstructions: z.string().trim().max(1000).optional(),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
});

export const paymentSubmissionSchema = z.object({
  roundId: z.string().uuid("Invalid raffle round"),
  momoProvider: z.enum(["MTN MoMo", "Telecel Cash", "AT Money"]),
  senderPhone: z
    .string()
    .trim()
    .min(9, "Enter the MoMo number used for payment")
    .max(20),
  transactionReference: z
    .string()
    .trim()
    .min(4, "Enter the MoMo transaction ID / reference")
    .max(80),
  receiptPath: z.string().trim().optional(),
});

export const claimNumberSchema = z.object({
  roundId: z.string().uuid("Invalid raffle round"),
  paymentId: z.string().uuid("Invalid payment"),
  displayName: z
    .string()
    .transform((v) => sanitizeDisplayName(v))
    .refine((v) => v.length >= 2 && v.length <= 30, {
      message: "Display name must be between 2 and 30 characters",
    }),
  number: z.coerce.number().int().min(1),
});

export const adminPaymentReviewSchema = z.object({
  paymentId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  adminNotes: z.string().trim().max(500).optional(),
});

