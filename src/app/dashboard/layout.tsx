import React from "react";
import Link from "next/link";
import { LayoutDashboard, Ticket, CreditCard, User, LogOut, Radio } from "lucide-react";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { emailToPhone } from "@/lib/validations";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const profile = await getCurrentProfile();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/entries", label: "My Entries", icon: Ticket },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#111111] p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Wordmark compact />
            <Link href="/raffles">
              <Button variant="ghost" size="sm">
                <Radio className="h-3.5 w-3.5 text-[#EF3038]" />
                Raffles
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#181818] p-3">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.full_name}
            </p>
            <p className="text-[11px] text-[#999999] truncate">
              {profile?.phone ||
                (profile?.email ? emailToPhone(profile.email) : "")}</p>
          </div>

          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#999999] hover:bg-white/5 hover:text-white whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <form action={signOutAction} className="hidden md:block pt-6 border-t border-white/10">
          <Button variant="ghost" size="sm" className="w-full justify-start text-[#999999]">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </aside>

      <main className="flex-1 p-5 sm:p-8 max-w-6xl">{children}</main>
    </div>
  );
}

