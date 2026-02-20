"use client";

import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXTRACTION_STEPS } from "@/types/extraction";
import type { ExtractionStatus } from "@/types/extraction";

interface ExtractionProgressProps {
  file: {
    id: string;
    file: File;
    status: ExtractionStatus;
    progress: number;
  };
}

function getStepState(
  stepStatus: ExtractionStatus,
  currentStatus: ExtractionStatus
): "completed" | "active" | "pending" {
  const stepIndex = EXTRACTION_STEPS.findIndex((s) => s.status === stepStatus);
  const currentIndex = EXTRACTION_STEPS.findIndex(
    (s) => s.status === currentStatus
  );

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

export function ExtractionProgress({ file }: ExtractionProgressProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* File info */}
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {file.file.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {(file.file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        <span className="font-tabular text-xs font-medium text-primary">
          {Math.round(file.progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${file.progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {EXTRACTION_STEPS.filter((s) => s.status !== "complete").map((step) => {
          const state = getStepState(step.status, file.status);
          return (
            <div
              key={step.status}
              className={cn(
                "flex items-center gap-3 text-sm transition-opacity",
                state === "pending" && "opacity-40"
              )}
            >
              {state === "completed" && (
                <Check className="h-4 w-4 shrink-0 text-status-loi" />
              )}
              {state === "active" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              )}
              {state === "pending" && (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  state === "completed" && "text-muted-foreground line-through",
                  state === "active" && "font-medium text-foreground",
                  state === "pending" && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
