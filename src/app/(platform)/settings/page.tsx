import { TopBar } from "@/components/layout/top-bar";

/**
 * Settings page — API keys, team management, integrations.
 */
export default function SettingsPage() {
  return (
    <>
      <TopBar
        title="Settings"
        description="API keys, team, and integrations"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* API Keys Section */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">
              API Keys
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure ATTOM Data and Placer.ai API keys for property
              enrichment.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  ATTOM Data API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter your ATTOM API key"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Placer.ai API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter your Placer.ai API key"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">
              Team Members
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage who has access to your deal room.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
