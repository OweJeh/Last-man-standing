"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Smartphone, KeyRound, CheckCircle2 } from "lucide-react";
import {
  requestPasswordResetOtpAction,
  verifyPasswordResetOtpAction,
} from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    const res = await requestPasswordResetOtpAction(phone);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Could not send SMS code");
      return;
    }
    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await verifyPasswordResetOtpAction({
      phone,
      otp,
      newPassword,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Password reset failed");
      return;
    }
    setStep("done");
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
            {step === "phone"
              ? "Enter your registered phone number to receive a 6-digit SMS verification code."
              : step === "otp"
              ? `Enter the 6-digit SMS code sent to ${phone.replace(/\D/g, "")} and choose a new password.`
              : "Your password has been updated."}
          </p>
        </CardHeader>
        <CardContent>
          {step === "done" ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-10 w-10 text-[#36B879] mx-auto" />
              <p className="text-sm text-[#999999]">
                You can now sign in with your phone number and new password.
              </p>
              <Link href="/login">
                <Button className="w-full">Go to Sign In</Button>
              </Link>
            </div>
          ) : step === "phone" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0241234567"
                  autoComplete="tel"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send SMS Code
              </Button>
              <Link
                href="/login"
                className="block text-center text-sm text-[#999999] hover:text-white"
              >
                Back to Sign In
              </Link>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {error && (
                <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 px-3.5 py-2.5 text-sm text-[#FF2020]">
                  {error}
                </div>
              )}
              <div>
                <Label htmlFor="otp">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-[#D8B66B]" />
                    6-Digit SMS Code
                  </span>
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
                className="w-full text-center text-sm text-[#999999] hover:text-white"
              >
                Use a different phone number
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
