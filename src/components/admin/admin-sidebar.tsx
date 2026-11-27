"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  CreditCard,
  Users,
  Trophy,
  Wallet,
  ScrollText,
  Settings,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  adminName: string;
  adminEmail: string;
}

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/raffles", label: "Raffles", icon: Layers },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/participants", label: "Participants", icon: Users },
  { href: "/admin/winners", label: "Winners", icon: Trophy },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ adminName, adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#0d0d0d] flex flex-col justify-between transition-all duration-300 ease-in-out",
        "md:sticky md:top-0 md:h-screen md:overflow-y-auto",
        collapsed ? "md:w-[68px] p-3" : "md:w-64 p-5"
      )}
    >
      <div className="space-y-5">
        {/* Header — logo + badge + collapse toggle */}
        <div className="flex items-center justify-between gap-2">
          {!collapsed && <Wordmark compact />}
          {!collapsed && (
            <span className="inline-flex items-center gap-1 rounded bg-[#D8B66B]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D8B66B]">
              <ShieldCheck className="h-3 w-3" />
              ADMIN
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden md:flex items-center justify-center h-7 w-7 rounded-md text-[#999999] hover:text-white hover:bg-white/5 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Admin identity card */}
        {!collapsed && (
          <div className="rounded-lg border border-white/10 bg-[#141414] p-3">
            <p className="text-xs font-semibold text-white truncate">{adminName}</p>
            <p className="text-[11px] text-[#999999] truncate">{adminEmail}</p>
          </div>
        )}

        {/* Collapsed: show icon-only admin badge */}
        {collapsed && (
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#D8B66B]/15 text-[#D8B66B]">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-[#999999] hover:bg-white/5 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer — sign out + back to site */}
      <div className={cn("space-y-2 pt-4 border-t border-white/10 hidden md:block", collapsed && "pt-3")}>
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full text-[#999999]", collapsed ? "justify-center px-2" : "justify-start")}
            title={collapsed ? "Back to site" : undefined}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && "Back to Site"}
          </Button>
        </Link>
        <form action={signOutAction}>
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full text-[#999999]", collapsed ? "justify-center px-2" : "justify-start")}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </Button>
        </form>
      </div>
    </aside>
  );
}

