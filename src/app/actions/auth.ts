"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { phoneToEmail } from "@/lib/validations";
import { sendArkeselSms } from "@/lib/sms/arkesel";
import type { ActionResult } from "./admin-raffles";

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function hashOtp(phoneDigits: string, otp: string): string {
  return crypto.createHash("sha256").update(`LMS_OTP_V1:${phoneDigits}:${otp}`).digest("hex");
}

/**
 * Send a 6-digit password reset OTP via Arkesel SMS.
 * Returns a generic success response even if the phone is unregistered
 * to prevent account enumeration.
 */
export async function requestPasswordResetOtpAction(
  rawPhone: string
): Promise<ActionResult> {
  try {
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (!/^(\+?233|0)\d{9}$/.test(rawPhone.trim()) && phoneDigits.length < 10) {
      return { ok: false, error: "Enter a valid Ghana phone number (e.g. 0241234567)" };
    }

    const supabase = createAdminSupabaseClient();
    const syntheticEmail = phoneToEmail(phoneDigits);

    // Rate-limit: 60-second cooldown per phone number
    const cooldownCutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phoneDigits)
      .gte("created_at", cooldownCutoff);

    if ((recentCount ?? 0) > 0) {
      return {
        ok: false,
        error: "Please wait 60 seconds before requesting another SMS code.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, email")
      .or(`email.eq.${syntheticEmail},phone.eq.${phoneDigits}`)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      // Generic success to prevent phone enumeration
      return { ok: true };
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = hashOtp(phoneDigits, otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("password_reset_otps").insert({
      user_id: profile.id,
      phone: phoneDigits,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      return { ok: false, error: "Unable to create reset code right now." };
    }

    const smsRes = await sendArkeselSms(
      profile.phone || phoneDigits,
      `Your Last Man Standing password reset code is ${otp}. It expires in 10 minutes. Do not share this code.`
    );

    if (!smsRes.ok) {
      return {
        ok: false,
        error: smsRes.error || "Failed to send SMS code. Please try again later.",
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to request reset code",
    };
  }
}

/** Verify the 6-digit Arkesel SMS OTP and update the user's password. */
export async function verifyPasswordResetOtpAction(input: {
  phone: string;
  otp: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    const phoneDigits = input.phone.replace(/\D/g, "");
    const otp = input.otp.trim();

    if (!/^\d{6}$/.test(otp)) {
      return { ok: false, error: "Enter the 6-digit SMS code" };
    }
    if (!input.newPassword || input.newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters" };
    }

    const supabase = createAdminSupabaseClient();
    const { data: record } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("phone", phoneDigits)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return { ok: false, error: "Invalid or expired SMS code. Request a new one." };
    }

    if (record.attempts >= 5) {
      return {
        ok: false,
        error: "Too many incorrect attempts. Please request a new SMS code.",
      };
    }

    const expectedHash = hashOtp(phoneDigits, otp);
    const matches =
      expectedHash.length === record.otp_hash.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedHash, "hex"),
        Buffer.from(record.otp_hash, "hex")
      );

    if (!matches) {
      await supabase
        .from("password_reset_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      return { ok: false, error: "Incorrect SMS code. Please check and try again." };
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(record.user_id, {
      password: input.newPassword,
    });

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await supabase
      .from("password_reset_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id);

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Password reset failed",
    };
  }
}
