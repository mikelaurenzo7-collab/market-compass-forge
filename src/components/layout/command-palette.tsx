"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutGrid,
  Briefcase,
  Upload,
  Settings,
  Search,
} from "lucide-react";

const COMMANDS = [
  {
    label: "Command Center",
    icon: LayoutGrid,
    href: "/command-center",
    group: "Navigation",
  },
  {
    label: "Deals Overview",
    icon: Briefcase,
    href: "/deals",
    group: "Navigation",
  },
  {
    label: "Upload Documents",
    icon: Upload,
    href: "/deals",
    group: "Actions",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
    group: "Navigation",
  },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command className="rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search deals, navigate, or take action..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {["Navigation", "Actions"].map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {COMMANDS.filter((c) => c.group === group).map((cmd) => (
                  <Command.Item
                    key={cmd.label}
                    value={cmd.label}
                    onSelect={() => {
                      setOpen(false);
                      router.push(cmd.href);
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <cmd.icon className="h-4 w-4 text-muted-foreground" />
                    {cmd.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
