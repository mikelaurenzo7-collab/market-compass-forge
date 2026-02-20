import { create } from "zustand";
import type { ExtractionResult, ExtractionStatus } from "@/types/extraction";

interface UploadFile {
  id: string;
  file: File;
  dealId: string;
  status: ExtractionStatus;
  progress: number;
  result: ExtractionResult | null;
  error: string | null;
}

interface UploadState {
  /** Queue of files being uploaded / extracted */
  files: UploadFile[];

  /** Add a file to the upload queue */
  addFile: (file: File, dealId: string) => string;

  /** Update the status of a queued file */
  updateFileStatus: (
    fileId: string,
    status: ExtractionStatus,
    progress: number
  ) => void;

  /** Set the extraction result for a completed file */
  setFileResult: (fileId: string, result: ExtractionResult) => void;

  /** Set an error for a failed file */
  setFileError: (fileId: string, error: string) => void;

  /** Remove a file from the queue */
  removeFile: (fileId: string) => void;

  /** Clear all completed files */
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],

  addFile: (file, dealId) => {
    const id = crypto.randomUUID();
    set((state) => ({
      files: [
        ...state.files,
        {
          id,
          file,
          dealId,
          status: "queued",
          progress: 0,
          result: null,
          error: null,
        },
      ],
    }));
    return id;
  },

  updateFileStatus: (fileId, status, progress) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, status, progress } : f
      ),
    })),

  setFileResult: (fileId, result) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? { ...f, status: "complete" as const, progress: 100, result }
          : f
      ),
    })),

  setFileError: (fileId, error) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? { ...f, status: "error" as const, error }
          : f
      ),
    })),

  removeFile: (fileId) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    })),

  clearCompleted: () =>
    set((state) => ({
      files: state.files.filter((f) => f.status !== "complete"),
    })),
}));
