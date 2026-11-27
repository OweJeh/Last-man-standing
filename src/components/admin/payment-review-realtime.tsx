"use client";

/**
 * Wraps the PaymentReviewClient and subscribes to Supabase Realtime
 * on the payment_submissions table so new/changed payments auto-appear.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PaymentReviewClient,
  type AdminPaymentRow,
} from "@/components/admin/payment-review-client";

export function PaymentReviewRealtime({
  payments: initial,
}: {
  payments: AdminPaymentRow[];
}) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-payment-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_submissions" },
        () => {
          // A payment was inserted, updated or deleted — refresh the server component
          router.refresh();
          setLastRefresh(Date.now());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return <PaymentReviewClient key={lastRefresh} payments={initial} />;
}

