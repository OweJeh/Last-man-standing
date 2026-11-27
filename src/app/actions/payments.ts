"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession, getCurrentUser } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { adminPaymentReviewSchema, paymentSubmissionSchema } from "@/lib/validations";
import type { ActionResult } from "./admin-raffles";

export async function submitPaymentAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Please sign in to submit a payment" };

    const parsed = paymentSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid payment details" };
    }

    const v = parsed.data;
    const supabase = createAdminSupabaseClient();

    // Verify round is LIVE
    const { data: round } = await supabase
      .from("raffle_rounds")
      .select("id, status, entry_fee_pesewas, participant_capacity, confirmed_entries_count")
      .eq("id", v.roundId)
      .single();

    if (!round) return { ok: false, error: "Raffle round not found" };
    if (round.status !== "live") {
      return { ok: false, error: "This raffle is not currently accepting entries" };
    }
    if (round.confirmed_entries_count >= round.participant_capacity) {
      return { ok: false, error: "This raffle is already full" };
    }

    // Check max entries + pending/approved payments for user in this round
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("max_entries_per_user_per_raffle")
      .eq("id", 1)
      .single();

    const maxEntries = settings?.max_entries_per_user_per_raffle ?? 3;

    const { count: existingPaymentsCount } = await supabase
      .from("payment_submissions")
      .select("id", { count: "exact", head: true })
      .eq("round_id", v.roundId)
      .eq("user_id", user.id)
      .in("status", ["pending", "approved", "consumed"]);

    if ((existingPaymentsCount ?? 0) >= maxEntries) {
      return {
        ok: false,
        error: `You have reached the maximum of ${maxEntries} entries/submissions for this raffle.`,
      };
    }

    // Prevent duplicate transaction reference
    const normalizedRef = v.transactionReference.trim().toUpperCase();
    const { data: dup } = await supabase
      .from("payment_submissions")
      .select("id")
      .eq("transaction_reference", normalizedRef)
      .maybeSingle();

    if (dup) {
      return {
        ok: false,
        error: "This MoMo transaction reference has already been submitted.",
      };
    }

    const { data, error } = await supabase
      .from("payment_submissions")
      .insert({
        round_id: v.roundId,
        user_id: user.id,
        amount_pesewas: round.entry_fee_pesewas,
        momo_provider: v.momoProvider,
        sender_phone: v.senderPhone,
        transaction_reference: normalizedRef,
        receipt_path: v.receiptPath || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/payments");
    revalidatePath(`/raffles/${v.roundId}`);
    revalidatePath("/admin/payments");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment submission failed" };
  }
}

export async function reviewPaymentAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await assertAdminSession();
    const parsed = adminPaymentReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid review input" };
    }

    const { paymentId, decision, adminNotes } = parsed.data;
    const supabase = createAdminSupabaseClient();

    const { data: payment } = await supabase
      .from("payment_submissions")
      .select("*, raffle_rounds(entry_fee_pesewas, status)")
      .eq("id", paymentId)
      .single();

    if (!payment) return { ok: false, error: "Payment submission not found" };
    if (payment.status !== "pending") {
      return {
        ok: false,
        error: `Payment already ${payment.status}; repeated review is not permitted`,
      };
    }

    const nextStatus = decision === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from("payment_submissions")
      .update({
        status: nextStatus,
        admin_notes: adminNotes || null,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("status", "pending");

    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: decision === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
      target_type: "payment_submission",
      target_id: paymentId,
      previous_value: { status: "pending" },
      new_value: { status: nextStatus, admin_notes: adminNotes || null },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/dashboard/payments");
    revalidatePath(`/raffles/${payment.round_id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment review failed" };
  }
}

