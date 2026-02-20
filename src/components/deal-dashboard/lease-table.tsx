"use client";

import { formatCurrency } from "@/lib/format";
import type { LeaseStructure } from "@/types/deal";

interface LeaseTableProps {
  leases: LeaseStructure[];
}

const LEASE_TYPE_LABELS: Record<string, string> = {
  NNN: "NNN",
  gross: "Gross",
  modified_gross: "Mod. Gross",
  ground: "Ground",
};

export function LeaseTable({ leases }: LeaseTableProps) {
  const totalRent = leases.reduce((sum, l) => sum + l.annual_rent, 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">
          Lease Structure ({leases.length} tenants)
        </h4>
        <span className="font-tabular text-xs font-medium text-foreground">
          {formatCurrency(totalRent)}/yr
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left">Tenant</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Annual Rent</th>
              <th className="px-4 py-2 text-right">Expiry</th>
              <th className="px-4 py-2 text-right">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leases.map((lease, i) => (
              <tr key={i} className="hover:bg-muted/50">
                <td className="max-w-[200px] truncate px-4 py-2.5 text-foreground">
                  {lease.tenant}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {LEASE_TYPE_LABELS[lease.lease_type]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-foreground">
                  {formatCurrency(lease.annual_rent)}
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-muted-foreground">
                  {new Date(lease.expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-muted-foreground">
                  {lease.renewal_options > 0
                    ? `${lease.renewal_options}x`
                    : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leases.length === 0 && (
        <p className="px-4 py-4 text-center text-xs text-muted-foreground">
          No leases recorded
        </p>
      )}
    </div>
  );
}
