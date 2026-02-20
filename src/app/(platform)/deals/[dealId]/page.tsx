"use client";

import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { DealHeader } from "@/components/deal-dashboard/deal-header";
import { OpCoPanel } from "@/components/deal-dashboard/opco-panel";
import { PropCoPanel } from "@/components/deal-dashboard/propco-panel";
import { getMockDeal } from "@/lib/mock-data";
import type { Deal, FinancialDataOpCo, PhysicalAssetPropCo } from "@/types/deal";

interface DealPageProps {
  params: { dealId: string };
}

export default function DealDashboardPage({ params }: DealPageProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [opco, setOpco] = useState<FinancialDataOpCo | null>(null);
  const [propco, setPropco] = useState<PhysicalAssetPropCo | null>(null);
  const [revenueData, setRevenueData] = useState<
    { quarter: string; revenue: number }[]
  >([]);

  useEffect(() => {
    // In production, fetch from Supabase via Server Action
    const data = getMockDeal(params.dealId);
    if (data) {
      setDeal(data.deal);
      setOpco(data.opco);
      setPropco(data.propco);
      setRevenueData(data.revenueQuarterly);
    }
  }, [params.dealId]);

  if (!deal) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DealHeader deal={deal} opco={opco} />

      <PanelGroup direction="horizontal" className="flex-1">
        {/* OpCo Panel — Left */}
        <Panel defaultSize={50} minSize={30}>
          {opco ? (
            <OpCoPanel opco={opco} revenueData={revenueData} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                No OpCo data — upload a CIM to extract financials
              </p>
            </div>
          )}
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle className="group relative flex w-2 items-center justify-center border-x border-border bg-muted/50 transition-colors hover:bg-accent data-[resize-handle-active]:bg-primary/20">
          <GripVertical className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </PanelResizeHandle>

        {/* PropCo Panel — Right */}
        <Panel defaultSize={50} minSize={30}>
          {propco ? (
            <PropCoPanel propco={propco} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                No PropCo data — upload a rent roll or ESA to extract assets
              </p>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}
