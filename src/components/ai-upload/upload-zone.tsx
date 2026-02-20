"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/stores/upload";
import { ExtractionProgress } from "./extraction-progress";
import { FileQueue } from "./file-queue";
import type { ExtractionStatus } from "@/types/extraction";
import { EXTRACTION_STEPS } from "@/types/extraction";

interface UploadZoneProps {
  dealId: string;
}

export function UploadZone({ dealId }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { files, addFile, updateFileStatus, setFileResult, setFileError } =
    useUploadStore();

  const dealFiles = files.filter((f) => f.dealId === dealId);

  const simulateExtraction = useCallback(
    async (fileId: string) => {
      // Simulate the multi-step extraction process
      for (const step of EXTRACTION_STEPS) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1200 + Math.random() * 800)
        );
        const progress =
          step.status === "complete"
            ? 100
            : ((EXTRACTION_STEPS.findIndex((s) => s.status === step.status) + 1) /
                EXTRACTION_STEPS.length) *
              100;
        updateFileStatus(fileId, step.status, progress);
      }

      setFileResult(fileId, {
        id: crypto.randomUUID(),
        deal_id: dealId,
        document_type: "CIM",
        file_name: "extracted",
        status: "complete",
        opco_data: {
          deal_id: dealId,
          ttm_revenue: 25_000_000 + Math.random() * 50_000_000,
          adjusted_ebitda: 5_000_000 + Math.random() * 15_000_000,
          ebitda_addbacks: [],
          debt_profile: [],
        },
        propco_data: null,
        confidence_score: 0.85 + Math.random() * 0.12,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    },
    [dealId, updateFileStatus, setFileResult]
  );

  const handleFiles = useCallback(
    (fileList: FileList) => {
      Array.from(fileList).forEach((file) => {
        const fileId = addFile(file, dealId);
        simulateExtraction(fileId);
      });
    },
    [addFile, dealId, simulateExtraction]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const activeExtractions = dealFiles.filter(
    (f) => f.status !== "complete" && f.status !== "error" && f.status !== "queued"
  );

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-all",
          isDragOver
            ? "border-primary bg-primary/5 shadow-inner"
            : "border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.xlsx,.csv"
          multiple
          onChange={handleInputChange}
          className="sr-only"
        />

        <div
          className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors",
            isDragOver ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Upload
            className={cn(
              "h-6 w-6 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        <h3 className="text-sm font-semibold text-foreground">
          {isDragOver ? "Drop files here" : "Drop CIM, Rent Roll, or ESA"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, or XLSX up to 10MB. AI will extract OpCo and PropCo data.
        </p>
        <p className="mt-3 text-xs font-medium text-primary">
          Browse files
        </p>
      </label>

      {/* Active extraction progress */}
      {activeExtractions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Extracting...
          </h3>
          {activeExtractions.map((file) => (
            <ExtractionProgress key={file.id} file={file} />
          ))}
        </div>
      )}

      {/* File queue */}
      {dealFiles.length > 0 && <FileQueue files={dealFiles} />}
    </div>
  );
}
