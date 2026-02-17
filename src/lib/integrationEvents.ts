export type IntegrationEventType =
  | "connected"
  | "disconnected"
  | "sync_started"
  | "sync_completed"
  | "sync_error"
  | "file_synced"
  | "event_synced"
  | "deal_synced"
  | "token_refreshed"
  | "token_expired";

export interface IntegrationEvent {
  integration_type: string;
  event_type: IntegrationEventType;
  details?: Record<string, unknown>;
  timestamp: string;
}
