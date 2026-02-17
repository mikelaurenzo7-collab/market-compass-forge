export type IntegrationType =
  | "slack"
  | "email"
  | "crm_salesforce"
  | "crm_affinity"
  | "crm_dealcloud"
  | "google_drive"
  | "onedrive"
  | "dropbox"
  | "gmail"
  | "outlook_email"
  | "google_calendar"
  | "outlook_calendar";

export type IntegrationCategory = "communication" | "cloud_storage" | "calendar" | "crm";

export type ConnectionStatus = "not_connected" | "connected" | "syncing" | "error";

export interface IntegrationDefinition {
  type: IntegrationType;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  iconBg: string;
  oauthRequired: boolean;
  oauthProvider?: "google" | "microsoft" | "dropbox" | "salesforce";
  oauthScopes?: string[];
  envKeyPrefix?: string;
}

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  // Communication
  {
    type: "slack",
    name: "Slack",
    description: "Deal alerts, deep links, and team notifications",
    category: "communication",
    icon: "MessageSquare",
    iconBg: "bg-[#4A154B]",
    oauthRequired: false,
  },
  {
    type: "gmail",
    name: "Gmail",
    description: "Forward emails to Deal Rooms, capture threads",
    category: "communication",
    icon: "Mail",
    iconBg: "bg-[#EA4335]",
    oauthRequired: true,
    oauthProvider: "google",
    oauthScopes: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
    envKeyPrefix: "GOOGLE",
  },
  {
    type: "outlook_email",
    name: "Outlook",
    description: "Forward emails to Deal Rooms, capture threads",
    category: "communication",
    icon: "Mail",
    iconBg: "bg-[#0078D4]",
    oauthRequired: true,
    oauthProvider: "microsoft",
    oauthScopes: ["Mail.Read", "Mail.Send"],
    envKeyPrefix: "MICROSOFT",
  },
  {
    type: "email",
    name: "Email to Pipeline",
    description: "Auto-create deals from forwarded intro emails",
    category: "communication",
    icon: "Inbox",
    iconBg: "bg-primary",
    oauthRequired: false,
  },
  // Cloud Storage
  {
    type: "google_drive",
    name: "Google Drive",
    description: "Sync files to Data Room, auto-import documents",
    category: "cloud_storage",
    icon: "HardDrive",
    iconBg: "bg-[#4285F4]",
    oauthRequired: true,
    oauthProvider: "google",
    oauthScopes: ["https://www.googleapis.com/auth/drive.file"],
    envKeyPrefix: "GOOGLE",
  },
  {
    type: "onedrive",
    name: "OneDrive",
    description: "Sync files to Data Room from Microsoft OneDrive",
    category: "cloud_storage",
    icon: "Cloud",
    iconBg: "bg-[#0078D4]",
    oauthRequired: true,
    oauthProvider: "microsoft",
    oauthScopes: ["Files.Read", "Files.ReadWrite"],
    envKeyPrefix: "MICROSOFT",
  },
  {
    type: "dropbox",
    name: "Dropbox",
    description: "Sync Dropbox folders to Data Room",
    category: "cloud_storage",
    icon: "Inbox",
    iconBg: "bg-[#0061FF]",
    oauthRequired: true,
    oauthProvider: "dropbox",
    oauthScopes: ["files.metadata.read", "files.content.read"],
    envKeyPrefix: "DROPBOX",
  },
  // Calendar
  {
    type: "google_calendar",
    name: "Google Calendar",
    description: "Sync deal milestones and IC meetings",
    category: "calendar",
    icon: "Calendar",
    iconBg: "bg-[#4285F4]",
    oauthRequired: true,
    oauthProvider: "google",
    oauthScopes: ["https://www.googleapis.com/auth/calendar"],
    envKeyPrefix: "GOOGLE",
  },
  {
    type: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Sync deal milestones and meetings to Outlook",
    category: "calendar",
    icon: "Calendar",
    iconBg: "bg-[#0078D4]",
    oauthRequired: true,
    oauthProvider: "microsoft",
    oauthScopes: ["Calendars.ReadWrite"],
    envKeyPrefix: "MICROSOFT",
  },
  // CRM
  {
    type: "crm_salesforce",
    name: "Salesforce",
    description: "Bidirectional deal and contact sync",
    category: "crm",
    icon: "Database",
    iconBg: "bg-[#00A1E0]",
    oauthRequired: true,
    oauthProvider: "salesforce",
    oauthScopes: ["api", "refresh_token"],
    envKeyPrefix: "SALESFORCE",
  },
  {
    type: "crm_affinity",
    name: "Affinity",
    description: "Sync relationships and deal flow",
    category: "crm",
    icon: "Users",
    iconBg: "bg-[#6366F1]",
    oauthRequired: false,
  },
  {
    type: "crm_dealcloud",
    name: "DealCloud",
    description: "Bidirectional pipeline sync",
    category: "crm",
    icon: "BarChart3",
    iconBg: "bg-[#1E293B]",
    oauthRequired: false,
  },
];

export const INTEGRATION_CATEGORIES: { key: IntegrationCategory; label: string; description: string }[] = [
  { key: "communication", label: "Communication", description: "Email and messaging integrations" },
  { key: "cloud_storage", label: "Cloud Storage", description: "Data Room file sync" },
  { key: "calendar", label: "Calendar", description: "Deal timeline sync" },
  { key: "crm", label: "CRM", description: "Customer relationship management" },
];

export function getIntegrationDef(type: IntegrationType): IntegrationDefinition | undefined {
  return INTEGRATION_DEFINITIONS.find((d) => d.type === type);
}

export function getIntegrationsByCategory(category: IntegrationCategory): IntegrationDefinition[] {
  return INTEGRATION_DEFINITIONS.filter((d) => d.category === category);
}

export function buildOAuthURL(def: IntegrationDefinition, redirectUri: string, state: string): string | null {
  if (!def.oauthRequired || !def.oauthProvider) return null;

  const clientIdKey = `VITE_${def.envKeyPrefix}_CLIENT_ID`;
  const clientId = (import.meta as any).env?.[clientIdKey] || "PLACEHOLDER";

  switch (def.oauthProvider) {
    case "google":
      return (
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(def.oauthScopes?.join(" ") || "")}&` +
        `access_type=offline&prompt=consent&` +
        `state=${encodeURIComponent(state)}`
      );
    case "microsoft":
      return (
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent((def.oauthScopes || []).concat(["offline_access"]).join(" "))}&` +
        `state=${encodeURIComponent(state)}`
      );
    case "dropbox":
      return (
        `https://www.dropbox.com/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `token_access_type=offline&` +
        `state=${encodeURIComponent(state)}`
      );
    case "salesforce":
      return (
        `https://login.salesforce.com/services/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(state)}`
      );
    default:
      return null;
  }
}

// Config shape interfaces
export interface OAuthTokenConfig {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_at?: string;
  provider?: string;
  connected_at?: string;
  status?: string;
}

export interface GoogleDriveConfig extends OAuthTokenConfig {
  sync_folder_id?: string;
  sync_folder_name?: string;
  auto_import?: boolean;
  sync_frequency?: "realtime" | "hourly" | "daily";
  last_sync_at?: string;
  items_synced?: number;
}

export interface CalendarConfig extends OAuthTokenConfig {
  calendar_id?: string;
  calendar_name?: string;
  sync_deal_milestones?: boolean;
  sync_meetings?: boolean;
  sync_direction?: "push" | "pull" | "both";
  last_sync_at?: string;
}

export interface CRMSyncConfig extends OAuthTokenConfig {
  api_key?: string;
  instance_url?: string;
  sync_deals?: boolean;
  sync_contacts?: boolean;
  sync_notes?: boolean;
  sync_direction?: "push" | "pull" | "both";
  field_mapping?: Record<string, string>;
  last_sync_at?: string;
  items_synced?: number;
}

export interface EmailEnhancedConfig extends OAuthTokenConfig {
  default_deal_id?: string;
  auto_draft?: boolean;
  thread_capture?: boolean;
  forwarding_address?: string;
  last_sync_at?: string;
}
