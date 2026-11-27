import React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";

export default async function ContactPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar userEmail={profile?.email} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-6">
        <h1 className="font-display text-3xl font-bold">Contact Support</h1>
        <Card className="bg-[#141414] border-white/10 p-6 space-y-3 text-sm text-[#999999]">
          <p>
            For MoMo payment verification inquiries, payout status, or technical support,
            include your account email and MoMo transaction reference.
          </p>
          <p className="text-white font-semibold">
            Support Email: support@lastmanstanding.gh
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

