import { cn } from "@/lib/utils";
import type { DealStatus } from "@/types/deal";

interface StatusBadgeProps {
  status: DealStatus;
  className?: string;
}

const STATUS_STYLES: Record<DealStatus, string> = {
  Teaser: "bg-status-teaser/10 text-status-teaser border-status-teaser/20",
  Diligence:
    "bg-status-diligence/10 text-status-diligence border-status-diligence/20",
  LOI: "bg-status-loi/10 text-status-loi border-status-loi/20",
  Closed: "bg-status-closed/10 text-status-closed border-status-closed/20",
};

/**
 * Deal status pill badge — color-coded by pipeline stage.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
