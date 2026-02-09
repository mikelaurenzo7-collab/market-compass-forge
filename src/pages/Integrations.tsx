import { useState } from "react";
import { Webhook, Zap, Loader2, Check, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
};

const EVENT_TYPES = [
  { value: "deal.stage_changed", label: "Deal stage changed" },
  { value: "deal.created", label: "New deal added to pipeline" },
  { value: "memo.generated", label: "Investment memo generated" },
  { value: "alert.triggered", label: "Alert triggered" },
  { value: "company.enriched", label: "Company data enriched" },
];

const Integrations = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => {
    const saved = localStorage.getItem("webhook-configs");
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  const saveWebhooks = (wh: WebhookConfig[]) => {
    setWebhooks(wh);
    localStorage.setItem("webhook-configs", JSON.stringify(wh));
  };

  const addWebhook = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const wh: WebhookConfig = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      url: newUrl.trim(),
      events: newEvents.length ? newEvents : EVENT_TYPES.map((e) => e.value),
      active: true,
    };
    saveWebhooks([...webhooks, wh]);
    setNewName("");
    setNewUrl("");
    setNewEvents([]);
    setShowForm(false);
    toast({ title: "Webhook added" });
  };

  const removeWebhook = (id: string) => {
    saveWebhooks(webhooks.filter((w) => w.id !== id));
    toast({ title: "Webhook removed" });
  };

  const toggleWebhook = (id: string) => {
    saveWebhooks(webhooks.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  };

  const testWebhook = async (wh: WebhookConfig) => {
    setTesting(wh.id);
    try {
      await fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event: "test",
          timestamp: new Date().toISOString(),
          source: "laurenzos-intelligence",
          data: { message: "Test webhook from Laurenzo's Private Intelligence" },
        }),
      });
      toast({ title: "Test sent", description: "Check your webhook destination for the payload." });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Connect webhooks and Zapier to automate your workflow</p>
      </div>

      {/* Zapier Section */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#FF4F00]/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-[#FF4F00]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Zapier</h3>
            <p className="text-xs text-muted-foreground">Connect to 5,000+ apps via Zapier webhooks</p>
          </div>
          <a
            href="https://zapier.com/apps/webhook/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Create a Zap <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="rounded-md bg-muted/30 border border-border p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How to connect:</strong> Create a new Zap in Zapier → Choose "Webhooks by Zapier" as your trigger → Copy the webhook URL → Add it below. Events from Laurenzo's will be sent to your Zap automatically.
          </p>
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Webhooks</h3>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{webhooks.length}</span>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            + Add Webhook
          </button>
        </div>

        {showForm && (
          <div className="px-4 py-4 border-b border-border space-y-3 bg-muted/10">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Slack Notifications"
                  className="h-9 w-full px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Webhook URL</label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  className="h-9 w-full px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Events (select which events trigger this webhook)</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setNewEvents((prev) => prev.includes(e.value) ? prev.filter((v) => v !== e.value) : [...prev, e.value])}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      newEvents.includes(e.value) ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addWebhook} disabled={!newName.trim() || !newUrl.trim()} className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                Save Webhook
              </button>
              <button onClick={() => setShowForm(false)} className="h-8 px-4 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border/50">
          {webhooks.map((wh) => (
            <div key={wh.id} className="px-4 py-3 flex items-center gap-4">
              <div className={`h-2 w-2 rounded-full shrink-0 ${wh.active ? "bg-green-500" : "bg-muted-foreground/30"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{wh.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map((e) => (
                    <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testWebhook(wh)}
                  disabled={testing === wh.id}
                  className="h-7 px-2 rounded text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {testing === wh.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                </button>
                <button
                  onClick={() => toggleWebhook(wh.id)}
                  className={`h-7 px-2 rounded text-[11px] font-medium border transition-colors ${
                    wh.active ? "border-green-500/30 text-green-500 hover:bg-green-500/10" : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {wh.active ? "Active" : "Paused"}
                </button>
                <button onClick={() => removeWebhook(wh.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {webhooks.length === 0 && !showForm && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No webhooks configured. Add one to start receiving events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Integrations;
