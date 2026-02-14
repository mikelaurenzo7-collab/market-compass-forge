import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Frosted glass card with subtle border glow.
 */
export default function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg shadow-black/5",
        "transition-all duration-300",
        hover && "hover:border-primary/20 hover:shadow-primary/5 hover:bg-card/80",
        className
      )}
    >
      {children}
    </div>
  );
}
