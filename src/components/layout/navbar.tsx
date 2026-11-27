"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Radio, ShieldCheck, LayoutDashboard } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  userEmail?: string | null;
  isAdmin?: boolean;
  liveRoundId?: string | null;
}

const navLinks = [
  { href: "/raffles", label: "Raffles" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/winners", label: "Winners" },
];

export function Navbar({ userEmail, isAdmin, liveRoundId }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080808]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href || pathname.startsWith(`${link.href}/`)
                  ? "text-white"
                  : "text-[#999999] hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
          {liveRoundId && (
            <Link
              href={`/live/${liveRoundId}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EF3038] hover:text-[#ff4a52]"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Watch Live
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {userEmail ? (
            <>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="secondary" size="sm">
                    <ShieldCheck className="h-4 w-4 text-[#D8B66B]" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Enter Raffle
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#111111] px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-white/90 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {liveRoundId && (
            <Link
              href={`/live/${liveRoundId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-[#EF3038]"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              Watch Live Broadcast
            </Link>
          )}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {userEmail ? (
              <>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Admin Control
                    </Button>
                  </Link>
                )}
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Participant Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

