import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  elevated?: boolean;
}

/**
 * Clean institutional card with subtle border.
 */
export default function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card relative overflow-hidden",
        "transition-all duration-300",
        hover && "hover:border-primary/20 hover:shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}
