import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

/**
 * Premium frosted glass card with animated border glow and depth.
 */
export default function GlassCard({ children, className, hover = true, glow = false }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl glass-premium relative overflow-hidden",
        "transition-all duration-500",
        hover && "hover:border-primary/20 hover:shadow-primary/10 hover:shadow-xl hover:-translate-y-0.5",
        glow && "border-breathe",
        className
      )}
    >
      {/* Top highlight line */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-px opacity-30"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.1), transparent)",
        }}
      />
      {children}
    </motion.div>
  );
}
