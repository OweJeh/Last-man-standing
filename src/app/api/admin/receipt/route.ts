import { NextResponse } from "next/server";
import { assertAdminSession } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Only allow paths that look like `{uuid}/{timestamp}-{filename}` to prevent path traversal. */
const RECEIPT_PATH_RE = /^[0-9a-f-]{36}\/\d+-[^/\\]+$/i;

export async function GET(req: Request) {
  try {
    await assertAdminSession();
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path || !RECEIPT_PATH_RE.test(path)) {
      return NextResponse.json({ error: "Invalid or missing receipt path" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 120);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

