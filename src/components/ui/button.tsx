import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

// ponytail: minimal shadcn-style button; add full variants via `npx shadcn add button` when needed
export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline" }) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    ghost: "hover:bg-muted",
    outline: "border border-border hover:bg-muted",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
