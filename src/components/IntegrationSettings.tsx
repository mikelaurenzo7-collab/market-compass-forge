import { useIntegrations } from "@/hooks/useIntegrations";
import { INTEGRATION_CATEGORIES } from "@/lib/integrations";
import IntegrationCard from "./integrations/IntegrationCard";
import SlackConfigPanel from "./integrations/SlackConfigPanel";
import EmailConfigPanel from "./integrations/EmailConfigPanel";
import CloudStorageConfigPanel from "./integrations/CloudStorageConfigPanel";
import CalendarConfigPanel from "./integrations/CalendarConfigPanel";
import CRMConfigPanel from "./integrations/CRMConfigPanel";
import IntegrationEventLog from "./integrations/IntegrationEventLog";
import type { IntegrationState } from "@/hooks/useIntegrations";

function getConfigPanel(
  state: IntegrationState,
  onUpdate: (config: Record<string, unknown>) => void
) {
  switch (state.type) {
    case "slack":
      return <SlackConfigPanel state={state} onUpdate={onUpdate} />;
    case "email":
    case "gmail":
    case "outlook_email":
      return <EmailConfigPanel state={state} onUpdate={onUpdate} />;
    case "google_drive":
    case "onedrive":
    case "dropbox":
      return <CloudStorageConfigPanel state={state} onUpdate={onUpdate} />;
    case "google_calendar":
    case "outlook_calendar":
      return <CalendarConfigPanel state={state} onUpdate={onUpdate} />;
    case "crm_salesforce":
    case "crm_affinity":
    case "crm_dealcloud":
      return <CRMConfigPanel state={state} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

export default function IntegrationSettings() {
  const { integrations, isLoading, connect, disconnect, upsertSetting } = useIntegrations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="h-20 bg-muted rounded-lg animate-pulse" />
              <div className="h-20 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status !== "not_connected").length;

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/15">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-primary">
            {connectedCount} of {integrations.length} connected
          </span>
        </div>
      </div>

      {/* Category sections */}
      {INTEGRATION_CATEGORIES.map((cat) => {
        const catIntegrations = integrations.filter(
          (i) => i.definition.category === cat.key
        );

        return (
          <div key={cat.key}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">{cat.label}</h2>
              <p className="text-[11px] text-muted-foreground">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.type}
                  integration={integration}
                  onConnect={() => connect(integration.type)}
                  onDisconnect={() => disconnect(integration.type)}
                >
                  {getConfigPanel(integration, (config: Record<string, unknown>) =>
                    upsertSetting.mutate({
                      type: integration.type,
                      config: { ...integration.config, ...config },
                      enabled: true,
                    })
                  )}
                </IntegrationCard>
              ))}
            </div>
          </div>
        );
      })}

      {/* Unified event log */}
      <IntegrationEventLog />
    </div>
  );
}
