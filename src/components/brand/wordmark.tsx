import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Minimal competition grid mark */}
      <span
        aria-hidden="true"
        className="grid grid-cols-2 gap-[2px] rounded border border-white/15 bg-[#111111] p-1"
      >
        <span className="h-1.5 w-1.5 rounded-[1px] bg-white" />
        <span className="h-1.5 w-1.5 rounded-[1px] bg-[#303030]" />
        <span className="h-1.5 w-1.5 rounded-[1px] bg-[#303030]" />
        <span className="h-1.5 w-1.5 rounded-[1px] bg-[#EF3038]" />
      </span>
      <span className="font-display text-sm sm:text-base font-bold tracking-[0.14em] text-white uppercase">
        {compact ? "LMS" : "LAST MAN STANDING"}
      </span>
    </span>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

