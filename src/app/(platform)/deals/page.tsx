"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, TrendingUp, Calendar } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyCompact } from "@/lib/format";
import { MOCK_DEALS, MOCK_OPCO_DATA } from "@/lib/mock-data";
import type { Deal } from "@/types/deal";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    // In production, fetch from Supabase via Server Action
    setDeals(MOCK_DEALS);
  }, []);

  return (
    <>
      <TopBar title="Deals" description="All active and closed transactions" />
      <div className="flex-1 overflow-auto p-6">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Deal</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Adj. EBITDA</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deals.map((deal) => {
                const opco = MOCK_OPCO_DATA[deal.id];
                return (
                  <tr
                    key={deal.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="block hover:text-primary"
                      >
                        <p className="font-medium text-foreground">
                          {deal.target_company}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deal.name}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deal.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-foreground">
                      {opco
                        ? formatCurrencyCompact(opco.adjusted_ebitda)
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-foreground">
                      {opco
                        ? formatCurrencyCompact(opco.ttm_revenue)
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-muted-foreground">
                      {new Date(deal.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
