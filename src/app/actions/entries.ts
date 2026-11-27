"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { claimNumberSchema } from "@/lib/validations";
import type { ActionResult } from "./admin-raffles";
import type { RaffleEntry } from "@/types/database";

export async function claimNumberAction(
  input: unknown
): Promise<ActionResult<RaffleEntry>> {
  try {
    const parsed = claimNumberSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid claim input" };
    }

    const v = parsed.data;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Authentication required" };

    const { data, error } = await supabase.rpc("claim_raffle_number", {
      p_round_id: v.roundId,
      p_payment_id: v.paymentId,
      p_display_name: v.displayName,
      p_number: v.number,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "That number was just claimed by another participant. Please pick another.",
        };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath(`/raffles/${v.roundId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/entries");
    revalidatePath("/dashboard/payments");
    revalidatePath("/raffles");
    revalidatePath("/");

    return { ok: true, data: data as RaffleEntry };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to claim number" };
  }
}

