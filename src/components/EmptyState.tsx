import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
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
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} className="gap-1.5">
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button size="sm" variant="outline" onClick={onSecondary}>
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
        <p className="text-[10px] text-muted-foreground/60 mt-3 max-w-[200px]">{hint}</p>
      )}
    </motion.div>
  );
}
