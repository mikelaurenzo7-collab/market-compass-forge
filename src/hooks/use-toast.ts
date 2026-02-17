/**
 * Compatibility shim: maps the old Radix toast API to Sonner.
 * All call-sites use `toast({ title, description?, variant? })`.
 * This re-exports a `toast` function with the same signature that
 * delegates to Sonner under the hood, so we only ship one toast library.
 */
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function toast({ title, description, variant }: ToastOptions) {
  if (variant === "destructive") {
    sonnerToast.error(title ?? "Error", { description });
  } else {
    sonnerToast(title ?? "", { description });
  }
}

export { toast };
