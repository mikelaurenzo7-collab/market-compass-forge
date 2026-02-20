"use client";

import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnvironmentalRisk } from "@/types/deal";

interface EnvironmentalRisksProps {
  risks: EnvironmentalRisk[];
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Shield; text: string; bg: string; border: string }
> = {
  clear: {
    icon: ShieldCheck,
    text: "text-status-loi",
    bg: "bg-status-loi/10",
    border: "border-status-loi/20",
  },
  flagged: {
    icon: ShieldAlert,
    text: "text-status-diligence",
    bg: "bg-status-diligence/10",
    border: "border-status-diligence/20",
  },
  in_review: {
    icon: ShieldQuestion,
    text: "text-status-teaser",
    bg: "bg-status-teaser/10",
    border: "border-status-teaser/20",
  },
  remediation_required: {
    icon: ShieldAlert,
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
};

const STATUS_LABELS: Record<string, string> = {
  clear: "Clear",
  flagged: "Flagged",
  in_review: "In Review",
  remediation_required: "Remediation Req.",
};

export function EnvironmentalRisks({ risks }: EnvironmentalRisksProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">
          Environmental Risks
        </h4>
      </div>

      <div className="space-y-2 p-3">
        {risks.map((risk, i) => {
          const config = STATUS_CONFIG[risk.status];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn("rounded-md border p-3", config.bg, config.border)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", config.text)} />
                  <span className="text-sm font-medium text-foreground">
                    {risk.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {risk.phase}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium",
                      config.text
                    )}
                  >
                    {STATUS_LABELS[risk.status]}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {risk.description}
              </p>
            </div>
          );
        })}
        {risks.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No environmental risks recorded
          </p>
        )}
      </div>
    </div>
  );
}
