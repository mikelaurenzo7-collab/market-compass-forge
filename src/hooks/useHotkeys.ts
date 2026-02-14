import { useEffect, useCallback } from "react";

type HotkeyHandler = () => void;

interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: HotkeyHandler;
  description?: string;
}

export const useHotkeys = (hotkeys: HotkeyConfig[]) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        const metaMatch = hk.meta ? e.metaKey : !e.metaKey;
        const ctrlMatch = hk.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = hk.shift ? e.shiftKey : !e.shiftKey;

        // Support Cmd/Ctrl interchangeably
        const modMatch = (hk.meta || hk.ctrl)
          ? (e.metaKey || e.ctrlKey) && (hk.shift ? e.shiftKey : true)
          : metaMatch && ctrlMatch && shiftMatch;

        if (modMatch && e.key.toLowerCase() === hk.key.toLowerCase()) {
          e.preventDefault();
          hk.handler();
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

// Arrow key navigation for tables
export const useTableNavigation = (
  rowCount: number,
  onSelect: (index: number) => void,
  isActive: boolean = true
) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;
      const focusedRow = document.querySelector("tr[data-focused='true']");
      const currentIndex = focusedRow
        ? Number(focusedRow.getAttribute("data-index"))
        : -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, rowCount - 1);
        updateFocus(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        updateFocus(prev);
      } else if (e.key === "Enter" && currentIndex >= 0) {
        e.preventDefault();
        onSelect(currentIndex);
      }
    },
    [rowCount, onSelect, isActive]
  );

  const updateFocus = (index: number) => {
    document.querySelectorAll("tr[data-focused]").forEach((el) => {
      el.setAttribute("data-focused", "false");
      el.classList.remove("ring-2", "ring-ring", "ring-inset");
    });
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) {
      row.setAttribute("data-focused", "true");
      row.classList.add("ring-2", "ring-ring", "ring-inset");
      row.scrollIntoView({ block: "nearest" });
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};

export const SIDEBAR_ROUTES = [
  "/dashboard",
  "/companies",
  "/public-markets",
  "/global",
  "/deals",
  "/deal-matcher",
  "/valuations",
  "/research",
  "/intelligence",
];

export const GLOBAL_HOTKEYS_HELP = [
  { keys: "⌘K", description: "Search / Command palette" },
  { keys: "⌘/", description: "Show keyboard shortcuts" },
  { keys: "⌘⇧D", description: "Toggle dashboard customization" },
  { keys: "⌘1-9", description: "Navigate sidebar sections" },
  { keys: "↑↓", description: "Navigate table rows" },
  { keys: "Enter", description: "Open selected item" },
  { keys: "Esc", description: "Close modal / deselect" },
];
