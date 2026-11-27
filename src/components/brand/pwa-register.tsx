"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lms-pwa-prompt-dismissed";

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        Boolean((window.navigator as { standalone?: boolean }).standalone));

    if (isStandalone || localStorage.getItem(DISMISS_KEY) === "1") {
      return;
    }

    setDismissed(false);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIosHint(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstallPrompt(null);
      setShowIosHint(false);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setDismissed(true);
    }
  };

  if (dismissed || (!installPrompt && !showIosHint)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-xl border border-white/15 bg-[#141414]/95 backdrop-blur-md p-3.5 shadow-2xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="grid grid-cols-2 gap-[2px] rounded border border-white/15 bg-[#080808] p-[5px] shrink-0"
          aria-hidden="true"
        >
          <span className="h-2 w-2 rounded-[2px] bg-white" />
          <span className="h-2 w-2 rounded-[2px] bg-[#303030]" />
          <span className="h-2 w-2 rounded-[2px] bg-[#303030]" />
          <span className="h-2 w-2 rounded-[2px] bg-[#EF3038]" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            Install Last Man Standing
          </p>
          {installPrompt ? (
            <p className="text-[11px] text-[#999999] truncate">
              Add to your home screen for quick access
            </p>
          ) : (
            <p className="text-[11px] text-[#999999] flex items-center gap-1 flex-wrap">
              Tap <Share className="h-3 w-3 inline text-white" /> then{" "}
              <span className="text-white font-medium">Add to Home Screen</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1 rounded-lg bg-[#EF3038] hover:bg-[#d9262e] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="rounded-lg p-1.5 text-[#999999] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

