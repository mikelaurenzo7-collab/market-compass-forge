import { TopBar } from "@/components/layout/top-bar";

/**
 * Command Center — Kanban deal pipeline.
 * Phase 4 will build the full drag-and-drop Kanban board here.
 */
export default function CommandCenterPage() {
  return (
    <>
      <TopBar
        title="Command Center"
        description="Deal pipeline at a glance"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4">
          {(["Teaser", "Diligence", "LOI", "Closed"] as const).map(
            (status) => (
              <div
                key={status}
                className="flex flex-col rounded-lg border border-border bg-card p-4"
              >
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  {status}
                </h2>
                <div className="flex-1 space-y-2">
                  <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    Kanban cards will render here
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
