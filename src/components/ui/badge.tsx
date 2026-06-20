import { cn } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={color ? { backgroundColor: `#${color}`, color: "#fff" } : undefined}
    >
      {children}
    </span>
  );
}
