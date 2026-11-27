import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "live" | "gold" | "success" | "danger" | "muted";
}) {
  const styles: Record<string, string> = {
    default: "bg-white/10 text-white border-white/15",
    live: "bg-[#EF3038]/15 text-[#EF3038] border-[#EF3038]/40",
    gold: "bg-[#D8B66B]/15 text-[#D8B66B] border-[#D8B66B]/40",
    success: "bg-[#36B879]/15 text-[#36B879] border-[#36B879]/40",
    danger: "bg-[#FF2020]/15 text-[#FF2020] border-[#FF2020]/40",
    muted: "bg-[#303030]/60 text-[#999999] border-white/10",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

