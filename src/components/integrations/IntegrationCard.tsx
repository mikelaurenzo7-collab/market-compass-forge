import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Mail, Inbox, HardDrive, Cloud, Calendar,
  Database, Users, BarChart3, Plug, Loader2, ChevronDown, ChevronUp, Unplug,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { IntegrationState } from "@/hooks/useIntegrations";
import type { ConnectionStatus } from "@/lib/integrations";

const STATUS_BADGES: Record<ConnectionStatus, { label: string; cls: string; dot: string }> = {
  not_connected: { label: "Not Connected", cls: "text-muted-foreground bg-muted/50", dot: "bg-muted-foreground" },
  connected: { label: "Connected", cls: "text-success bg-success/10", dot: "bg-success" },
  syncing: { label: "Syncing...", cls: "text-primary bg-primary/10", dot: "bg-primary animate-pulse" },
  error: { label: "Error", cls: "text-destructive bg-destructive/10", dot: "bg-destructive" },
};

const ICON_MAP: Record<string, typeof Plug> = {
  MessageSquare, Mail, Inbox, HardDrive, Cloud, Calendar,
  Database, Users, BarChart3, Plug,
};

interface IntegrationCardProps {
  integration: IntegrationState;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting?: boolean;
  children?: React.ReactNode;
}

export default function IntegrationCard({
  integration, onConnect, onDisconnect, connecting, children,
}: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { definition: def, status } = integration;
  const badge = STATUS_BADGES[status];

  const Icon = ICON_MAP[def.icon] ?? Plug;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-border/80">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-lg ${def.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{def.name}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>

          {status === "not_connected" ? (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Connect
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {status !== "not_connected" && !expanded && (integration.lastSyncAt || integration.itemsSynced != null) && (
        <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          {integration.lastSyncAt && (
            <span>Last sync: {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}</span>
          )}
          {integration.itemsSynced != null && (
            <span>{integration.itemsSynced} items synced</span>
          )}
        </div>
      )}

      <AnimatePresence>
        {expanded && status !== "not_connected" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
              {children}
              <div className="flex justify-end pt-2 border-t border-border/50">
                <button
                  onClick={onDisconnect}
                  className="h-7 px-2.5 rounded text-[10px] text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"
                >
                  <Unplug className="h-3 w-3" /> Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
