"use client";

import { PropertyList } from "./property-list";
import { LeaseTable } from "./lease-table";
import { MaintenanceFlags } from "./maintenance-flags";
import { EnvironmentalRisks } from "./environmental-risks";
import type { PhysicalAssetPropCo } from "@/types/deal";

interface PropCoPanelProps {
  propco: PhysicalAssetPropCo;
}

export function PropCoPanel({ propco }: PropCoPanelProps) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Panel label */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-propco" />
        <h2 className="text-sm font-semibold text-foreground">
          PropCo — Physical Assets
        </h2>
      </div>

      {/* Properties */}
      <PropertyList addresses={propco.property_addresses} />

      {/* Lease structure */}
      <LeaseTable leases={propco.lease_structure} />

      {/* Deferred maintenance */}
      <MaintenanceFlags flags={propco.deferred_maintenance_flags} />

      {/* Environmental risks */}
      <EnvironmentalRisks risks={propco.environmental_risks} />
    </div>
  );
}
