"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#080808] arena-grid-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Wordmark />
      </div>

      <Card className="w-full max-w-md border-white/10 bg-[#141414]">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <p className="text-sm text-[#999999]">
            Enter your account email and we will send you a password recovery link.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center py-4">
              <MailCheck className="h-10 w-10 text-[#36B879] mx-auto" />
              <p className="text-sm text-[#999999]">
                If an account exists for <strong className="text-white">{email}</strong>,
                a reset link has been sent.
              </p>
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
                  {error}
                </div>
              )}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Link
                href="/login"
                className="block text-center text-sm text-[#999999] hover:text-white"
              >
                Back to Sign In
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

