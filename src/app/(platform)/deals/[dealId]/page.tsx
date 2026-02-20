import { TopBar } from "@/components/layout/top-bar";

interface DealPageProps {
  params: { dealId: string };
}

/**
 * OpCo / PropCo Deal Dashboard — the core analytical view.
 * Phase 5 will build the full resizable split panel here:
 *   Left = OpCo (financials, EBITDA, debt profile)
 *   Right = PropCo (property addresses, leases, environmental risks)
 */
export default function DealDashboardPage({ params }: DealPageProps) {
  return (
    <>
      <TopBar
        title="Deal Dashboard"
        description={`Deal ${params.dealId} — OpCo / PropCo Analysis`}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* OpCo Panel — Left */}
        <div className="flex flex-1 flex-col border-r border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-opco" />
            <h2 className="text-sm font-semibold text-foreground">
              OpCo — Operating Company
            </h2>
          </div>
          <div className="flex-1 rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            TTM Revenue, Adjusted EBITDA, Addbacks, Debt Profile
          </div>
        </div>

        {/* PropCo Panel — Right */}
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-propco" />
            <h2 className="text-sm font-semibold text-foreground">
              PropCo — Physical Assets
            </h2>
          </div>
          <div className="flex-1 rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Property Addresses, Lease Structure, Deferred Maintenance, Environmental Risks
          </div>
        </div>
      </div>
    </>
  );
}
