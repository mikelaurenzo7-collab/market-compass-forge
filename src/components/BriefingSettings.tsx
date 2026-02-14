import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Mail, Loader2, Save, Clock, Send } from "lucide-react";

const BriefingSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["briefing-prefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefing_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState<{
    enabled: boolean;
    frequency: string;
    include_watchlists: boolean;
    include_portfolio: boolean;
    include_funding: boolean;
    include_news_sentiment: boolean;
    email_override: string;
  } | null>(null);

  const current = form ?? {
    enabled: prefs?.enabled ?? true,
    frequency: prefs?.frequency ?? "daily",
    include_watchlists: prefs?.include_watchlists ?? true,
    include_portfolio: prefs?.include_portfolio ?? true,
    include_funding: prefs?.include_funding ?? true,
    include_news_sentiment: prefs?.include_news_sentiment ?? true,
    email_override: prefs?.email_override ?? "",
  };

  const update = (key: string, val: any) => setForm({ ...current, [key]: val });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        enabled: current.enabled,
        frequency: current.frequency,
        include_watchlists: current.include_watchlists,
        include_portfolio: current.include_portfolio,
        include_funding: current.include_funding,
        include_news_sentiment: current.include_news_sentiment,
        email_override: current.email_override || null,
      };

      if (prefs) {
        const { error } = await supabase
          .from("briefing_preferences")
          .update(payload)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("briefing_preferences")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefing-prefs"] });
      toast({ title: "Briefing preferences saved" });
      setForm(null);
    },
    onError: (e) => {
      toast({ title: "Failed to save", description: String(e), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transform transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </label>
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Daily Briefing</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Receive a morning digest with portfolio P&L, watchlist movements, funding rounds, and market sentiment.
      </p>

      <Toggle checked={current.enabled} onChange={(v) => update("enabled", v)} label="Enable daily briefing" />

      {current.enabled && (
        <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-1">
          {/* Frequency */}
          <div className="pl-3">
            <label className="text-xs text-muted-foreground block mb-1.5">Frequency</label>
            <div className="flex gap-2">
              {["daily", "weekly"].map((f) => (
                <button
                  key={f}
                  onClick={() => update("frequency", f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1 ${
                    current.frequency === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content toggles */}
          <div className="pl-3 space-y-0.5">
            <label className="text-xs text-muted-foreground block mb-1">Content</label>
            <Toggle checked={current.include_portfolio} onChange={(v) => update("include_portfolio", v)} label="Portfolio P&L" />
            <Toggle checked={current.include_watchlists} onChange={(v) => update("include_watchlists", v)} label="Watchlist movers" />
            <Toggle checked={current.include_funding} onChange={(v) => update("include_funding", v)} label="Recent funding rounds" />
            <Toggle checked={current.include_news_sentiment} onChange={(v) => update("include_news_sentiment", v)} label="News sentiment" />
          </div>

          {/* Email override */}
          <div className="pl-3">
            <label className="text-xs text-muted-foreground block mb-1">Send to (optional override)</label>
            <input
              type="email"
              value={current.email_override}
              onChange={(e) => update("email_override", e.target.value)}
              placeholder={user?.email ?? "your@email.com"}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save Preferences
        </button>
        <SendTestBriefingButton />
      </div>
    </div>
  );
};

const SendTestBriefingButton = () => {
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-briefing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Failed to send");
      toast({ title: "Test briefing sent!", description: `Check ${result.sent_to}` });
    } catch (e) {
      toast({ title: "Failed to send test", description: String(e), variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <button
      onClick={sendTest}
      disabled={sending}
      className="h-9 px-4 rounded-md border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
    >
      {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      Send Test
    </button>
  );
};

export default BriefingSettings;
