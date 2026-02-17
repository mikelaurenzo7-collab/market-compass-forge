import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { IntegrationState } from "@/hooks/useIntegrations";

interface Props {
  state: IntegrationState;
  onUpdate: (config: Record<string, unknown>) => void;
}

export default function EmailConfigPanel({ state, onUpdate }: Props) {
  const { user } = useAuth();
  const isOAuthEmail = state.type === "gmail" || state.type === "outlook_email";
  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-inbound`;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    toast.success("Endpoint URL copied");
  };

  const { data: emailLog } = useQuery({
    queryKey: ["email-inbound-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_inbound_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (isOAuthEmail) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-secondary/50 border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">OAuth Email Connected</p>
          <p className="text-xs text-muted-foreground">
            Your {state.type === "gmail" ? "Gmail" : "Outlook"} account is linked. Forwarded emails will automatically create Deal Room drafts.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={(state.config.auto_draft as boolean) ?? true}
            onChange={(e) => onUpdate({ ...state.config, auto_draft: e.target.checked })}
            className="rounded border-border"
          />
          Auto-create Deal Room drafts from forwarded emails
        </label>

        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={(state.config.thread_capture as boolean) ?? false}
            onChange={(e) => onUpdate({ ...state.config, thread_capture: e.target.checked })}
            className="rounded border-border"
          />
          Capture full email threads into deal timeline
        </label>
      </div>
    );
  }

  // Email-to-Pipeline (webhook-based)
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-secondary/50 border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">How it works</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Forward intro emails to the webhook endpoint below</li>
          <li>Grapevine extracts company names and contacts automatically</li>
          <li>New companies are created and added to your pipeline as "Watching"</li>
        </ol>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Webhook Endpoint</label>
        <div className="flex gap-2">
          <code className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-xs text-foreground font-mono flex items-center truncate">
            {endpointUrl}
          </code>
          <button
            onClick={copyEndpoint}
            className="h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>

      {emailLog && emailLog.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Emails</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {emailLog.map((entry: Record<string, unknown>) => (
              <div key={entry.id as string} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                <div className="min-w-0">
                  <span className="text-foreground truncate block">{(entry.subject as string) || (entry.from_email as string)}</span>
                  {entry.parsed_company && (
                    <span className="text-muted-foreground">→ {entry.parsed_company as string}</span>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                  entry.action_taken === "deal_created" ? "bg-success/10 text-success" :
                  entry.action_taken === "company_created" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {(entry.action_taken as string)?.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
