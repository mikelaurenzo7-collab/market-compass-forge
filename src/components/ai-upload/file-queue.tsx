"use client";

import { FileText, Check, AlertCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { useUploadStore } from "@/stores/upload";
import type { ExtractionStatus } from "@/types/extraction";

interface UploadFile {
  id: string;
  file: File;
  dealId: string;
  status: ExtractionStatus;
  progress: number;
  result: unknown;
  error: string | null;
}

interface FileQueueProps {
  files: UploadFile[];
}

function StatusIcon({ status }: { status: ExtractionStatus }) {
  switch (status) {
    case "complete":
      return <Check className="h-4 w-4 text-status-loi" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "queued":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
}

export function FileQueue({ files }: FileQueueProps) {
  const { removeFile, clearCompleted } = useUploadStore();

  const completedCount = files.filter((f) => f.status === "complete").length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">
          Processed Documents ({files.length})
        </h4>
        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear completed
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              file.status === "error" && "bg-destructive/5"
            )}
          >
            <StatusIcon status={file.status} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {file.file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {file.status === "complete" && file.result
                  ? `Confidence: ${formatPercent(
                      ((file.result as { confidence_score?: number })
                        .confidence_score ?? 0) * 100,
                      0
                    )}`
                  : file.status === "error"
                  ? file.error ?? "Extraction failed"
                  : file.status === "queued"
                  ? "Waiting..."
                  : `Processing — ${Math.round(file.progress)}%`}
              </p>
            </div>

            <button
              onClick={() => removeFile(file.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
