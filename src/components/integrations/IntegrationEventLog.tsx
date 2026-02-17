import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Mail, Activity } from "lucide-react";

interface LogEntry {
  id: string;
  source: "slack" | "email";
  summary: string;
  status: string;
  timestamp: string;
}

export default function IntegrationEventLog() {
  const { user } = useAuth();

  const { data: slackLog } = useQuery({
    queryKey: ["slack-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("slack_notifications")
        .select("id, message_type, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: emailLog } = useQuery({
    queryKey: ["email-inbound-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_inbound_log")
        .select("id, subject, action_taken, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const entries: LogEntry[] = [
    ...(slackLog ?? []).map((s) => ({
      id: s.id,
      source: "slack" as const,
      summary: (s.message_type as string).replace(/_/g, " "),
      status: s.status as string,
      timestamp: s.created_at as string,
    })),
    ...(emailLog ?? []).map((e) => ({
      id: e.id,
      source: "email" as const,
      summary: (e.subject as string) || "Email processed",
      status: (e.action_taken as string) || "processed",
      timestamp: e.created_at as string,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (entries.length === 0) return null;

  const SourceIcon = ({ source }: { source: string }) => {
    if (source === "slack") return <MessageSquare className="h-3 w-3 text-[#4A154B]" />;
    if (source === "email") return <Mail className="h-3 w-3 text-primary" />;
    return <Activity className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        <p className="text-[11px] text-muted-foreground">Cross-integration event log</p>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {entries.slice(0, 10).map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
            <SourceIcon source={entry.source} />
            <span className="text-foreground flex-1 truncate">{entry.summary}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              entry.status === "sent" || entry.status === "deal_created" ? "bg-success/10 text-success" :
              entry.status === "failed" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            }`}>
              {entry.status.replace(/_/g, " ")}
            </span>
            <span className="text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
