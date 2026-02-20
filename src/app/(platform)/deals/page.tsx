import { TopBar } from "@/components/layout/top-bar";

/**
 * Deals overview page — lists all deals the user has access to.
 * Phase 4/5 will replace this with a full table + filters.
 */
export default function DealsPage() {
  return (
    <>
      <TopBar
        title="Deals"
        description="All active and closed transactions"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-sm font-medium text-foreground">No deals yet</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a deal from the Command Center or upload a CIM to get started.
          </p>
        </div>
      </div>
    </>
  );
}
