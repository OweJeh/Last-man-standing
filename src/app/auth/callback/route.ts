import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Allowlist of safe post-auth redirect paths. Must start with /. */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Only allow relative paths that start with / and don't escape via // or \\
  if (/^\/[^/\\]/.test(raw) || raw === "/") return raw;
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

