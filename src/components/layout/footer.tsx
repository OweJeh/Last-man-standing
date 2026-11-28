import React from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080808] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Wordmark />
            <p className="text-xs leading-relaxed text-[#999999]">
              One Number. One Chance. Last Man Standing. Live televised-grade grid
              elimination competition.
            </p>
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white mb-3">
              Competition
            </h4>
            <ul className="space-y-2 text-sm text-[#999999]">
              <li>
                <Link href="/raffles" className="hover:text-white transition-colors">
                  Active Raffles
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/winners" className="hover:text-white transition-colors">
                  Past Winners
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white mb-3">
              Account
            </h4>
            <ul className="space-y-2 text-sm text-[#999999]">
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-[#999999]">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/responsible-play" className="hover:text-white transition-colors">
                  Responsible Play
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#666666]">
          <p>© {new Date().getFullYear()} Last Man Standing Raffle. All rights reserved.</p>
          <p>18+ Only. Play Responsibly.</p>
        </div>
      </div>
    </footer>
  );
}

