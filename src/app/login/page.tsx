"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations";
import { phoneToEmail } from "@/lib/validations";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackgroundAnimation } from "@/components/ui/grid-bg-animation";
import type { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(values.phone),
      password: values.password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#080808] relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      {/* Animated grid background */}
      <GridBackgroundAnimation
        intensity="subtle"
        className="absolute inset-0 z-0"
      />
      {/* Top red radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(239,48,56,0.14),transparent_70%)] z-[1]"
      />

      <div className="relative z-[2] mb-8">
        <Wordmark />
      </div>

      <Card className="relative z-[2] w-full max-w-md border-white/10 bg-[#141414]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#EF3038] mb-1">
            <Lock className="h-3.5 w-3.5" />
            Competitor Access
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <p className="text-sm text-[#999999]">
            Enter your phone number and password to access your entries and submit MoMo
            payments.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="phone">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[#EF3038]" />
                  Phone Number
                </span>
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0241234567"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-[#FF2020]">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="mb-0">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#999999] hover:text-white transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-[#FF2020]">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#999999]">
            New to Last Man Standing?{" "}
            <Link href="/register" className="font-semibold text-white hover:text-[#EF3038]">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <LoginForm />
    </Suspense>
  );
}

