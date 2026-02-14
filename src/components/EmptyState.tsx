import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
      <div className="flex items-center gap-2">
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
      </div>
    </motion.div>
  );
}
