import { motion } from "framer-motion";
import { LucideIcon, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  quickActions?: QuickAction[];
  hint?: string;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary, quickActions, hint }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-14 px-6 text-center relative"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,hsl(var(--primary)/0.04),transparent)] pointer-events-none" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/20 relative"
      >
        <Icon className="h-8 w-8 text-primary" />
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="h-2.5 w-2.5 text-primary" />
        </div>
      </motion.div>

      <h3 className="text-base font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-5 leading-relaxed">{description}</p>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} className="gap-1.5 shadow-lg shadow-primary/10">
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button size="sm" variant="outline" onClick={onSecondary} className="border-border/60">
            {secondaryLabel}
          </Button>
        )}
        {quickActions?.map((qa) => (
          <Button key={qa.label} size="sm" variant={qa.variant ?? "ghost"} onClick={qa.onClick} className="text-xs">
            {qa.label}
          </Button>
        ))}
      </div>

      {hint && (
        <p className="text-[10px] text-muted-foreground/50 mt-4 max-w-[220px] leading-relaxed">{hint}</p>
      )}
    </motion.div>
  );
}
