import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF3038] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[#EF3038] text-white hover:bg-[#d9262e] shadow-[0_0_24px_rgba(239,48,56,0.25)]",
        secondary:
          "bg-[#181818] text-white border border-white/15 hover:bg-[#222222] hover:border-white/30",
        outline:
          "border border-white/20 bg-transparent text-white hover:bg-white/5",
        ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/5",
        gold: "bg-[#D8B66B] text-[#080808] hover:bg-[#e5c57e] font-bold",
        success: "bg-[#36B879] text-[#080808] hover:bg-[#3fc986] font-bold",
        danger: "bg-[#FF2020] text-white hover:bg-[#e01818]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

