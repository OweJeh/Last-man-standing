import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-white/15 bg-[#111111] px-3.5 py-2 text-sm text-white placeholder:text-[#666666] focus:border-[#EF3038] focus:outline-none focus:ring-1 focus:ring-[#EF3038] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-md border border-white/15 bg-[#111111] px-3.5 py-2.5 text-sm text-white placeholder:text-[#666666] focus:border-[#EF3038] focus:outline-none focus:ring-1 focus:ring-[#EF3038] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn("block text-xs font-semibold uppercase tracking-wider text-[#999999] mb-1.5", className)}
      {...props}
    />
  );
});
Label.displayName = "Label";

