"use client";

import { Search } from "lucide-react";

interface TopBarProps {
  title: string;
  description?: string;
}

export function TopBar({ title, description }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Global search trigger — will open CommandPalette */}
      <button
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Search"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search deals...</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
