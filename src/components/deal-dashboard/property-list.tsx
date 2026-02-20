"use client";

import { MapPin } from "lucide-react";

interface PropertyListProps {
  addresses: string[];
}

export function PropertyList({ addresses }: PropertyListProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">
          Properties ({addresses.length})
        </h4>
      </div>
      <div className="divide-y divide-border">
        {addresses.map((address, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-propco" />
            <p className="text-sm text-foreground">{address}</p>
          </div>
        ))}
        {addresses.length === 0 && (
          <p className="px-4 py-4 text-center text-xs text-muted-foreground">
            No properties recorded
          </p>
        )}
      </div>
    </div>
  );
}
