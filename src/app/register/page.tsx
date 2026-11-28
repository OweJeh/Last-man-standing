"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, UserPlus, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, phoneToEmail } from "@/lib/validations";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridBackgroundAnimation } from "@/components/ui/grid-bg-animation";
import type { z } from "zod";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    const supabase = createClient();
    const syntheticEmail = phoneToEmail(values.phone);

    const { error: authError } = await supabase.auth.signUp({
      email: syntheticEmail,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          phone: values.phone.replace(/\D/g, ""),
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#080808] relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      {/* Animated grid background */}
      <GridBackgroundAnimation
        intensity="vibrant"
        className="absolute inset-0 z-0"
      />
      {/* Top red radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(239,48,56,0.16),transparent_70%)] z-[1]"
      />

      <div className="relative z-[2] mb-8">
        <Wordmark />
      </div>

      <Card className="relative z-[2] w-full max-w-md border-white/10 bg-[#141414]/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#EF3038] mb-1">
            <UserPlus className="h-3.5 w-3.5" />
            Competitor Registration
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-sm text-[#999999]">
            Register with your phone number to enter raffles, submit MoMo payments, and
            claim your numbers.
          </p>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-[#36B879] mx-auto" />
              <h3 className="font-display text-lg font-bold">Account Created!</h3>
              <p className="text-sm text-[#999999]">
                Your account is ready. Sign in with your phone number and password to
                enter the active raffle.
              </p>
              <Link href="/login" className="block">
                <Button className="w-full">Go to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Kwame Mensah"
                  autoComplete="name"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-[#FF2020]">{errors.fullName.message}</p>
                )}
              </div>

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
                  placeholder="0241234567"
                  autoComplete="tel"
                  {...register("phone")}
                />
                <p className="mt-1 text-xs text-[#666666]">
                  This is your login ID — use your MoMo number for easy payments.
                </p>
                {errors.phone && (
                  <p className="mt-1 text-xs text-[#FF2020]">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-[#FF2020]">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-[#FF2020]">
                    {errors.confirmPassword.message}
                  </p>
                )}
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#999999] hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-[#111111] accent-[#EF3038] cursor-pointer"
                  />
                  Show password
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-[#999999]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-white hover:text-[#EF3038]">
                Sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

