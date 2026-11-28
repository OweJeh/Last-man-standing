/**
 * Server-only Arkesel SMS v2 client for Ghana phone numbers.
 * Used for password-reset OTPs and winner congratulations alerts.
 */

export interface SmsResult {
  ok: boolean;
  error?: string;
}

/** Normalize Ghana phone numbers (e.g. 0244123456 or +233244123456 -> 233244123456). */
export function normalizeGhanaSmsPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  return digits;
}

export async function sendArkeselSms(
  recipientPhone: string,
  message: string
): Promise<SmsResult> {
  if (typeof window !== "undefined") {
    throw new Error("sendArkeselSms must only run on the server");
  }

  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = (process.env.ARKESEL_SENDER_ID || "LMSRAFFLE").slice(0, 11);

  if (!apiKey) {
    console.warn("[Arkesel SMS] ARKESEL_API_KEY is not configured; skipping SMS send.");
    return { ok: false, error: "SMS provider not configured" };
  }

  const recipient = normalizeGhanaSmsPhone(recipientPhone);
  if (!recipient || recipient.length < 10) {
    return { ok: false, error: "Invalid recipient phone number" };
  }

  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender,
        message,
        recipients: [recipient],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[Arkesel SMS] API error:", res.status, body);
      return { ok: false, error: `SMS gateway error (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Arkesel SMS] Request failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

