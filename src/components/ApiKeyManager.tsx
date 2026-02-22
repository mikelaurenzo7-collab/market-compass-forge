import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff, RefreshCw, Gauge, Clock3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, startOfDay, startOfHour } from "date-fns";

const generateApiKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "lpi_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const hashKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const RATE_LIMIT_DEFAULTS: Record<string, number> = {
  analyst: 500,
  free: 500,
  essential: 500,
  professional: 10000,
  pro: 10000,
  institutional: 1000000,
  enterprise: 1000000,
};

const ApiKeyManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyExpiresInDays, setKeyExpiresInDays] = useState("90");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", user?.id],
    queryFn: async () => {
      const [{ data: keyRows, error: keyError }, { data: secrets, error: secretsError }] = await Promise.all([
        supabase
          .from("api_keys")
          .select("id, user_id, name, scopes, is_active, expires_at, created_at, last_used_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("api_key_secrets")
          .select("api_key_id, key_prefix"),
      ]);

      if (keyError) throw keyError;
      if (secretsError) throw secretsError;

      const prefixById = new Map((secrets ?? []).map((s) => [s.api_key_id, s.key_prefix]));
      return (keyRows ?? []).map((k) => ({
        ...k,
        key_prefix: prefixById.get(k.id) ?? "lpi_****",
      }));
    },
    enabled: !!user,
  });

  const { data: usageOverview } = useQuery({
    queryKey: ["api-usage-overview", user?.id],
    queryFn: async () => {
      const dayStart = startOfDay(new Date()).toISOString();
      const hourStart = startOfHour(new Date()).toISOString();

      const { data: tierData } = await supabase
        .from("subscription_tiers")
        .select("tier")
        .eq("user_id", user!.id)
        .maybeSingle();
      const normalizedPlan = (tierData?.tier === "pro" ? "professional" : tierData?.tier) ?? "essential";

      const [usageTodayRes, entitlementsRes, rateRes] = await Promise.all([
        supabase
          .from("usage_tracking")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("action", "api_request")
          .gte("created_at", dayStart),
        supabase
          .from("plan_entitlements")
          .select("feature_key, daily_limit, monthly_limit")
          .eq("plan_name", normalizedPlan)
          .eq("feature_key", "api_request")
          .eq("enabled", true)
          .maybeSingle(),
        supabase
          .from("rate_limits")
          .select("request_count")
          .eq("identifier", user!.id)
          .eq("endpoint", "api-access")
          .gte("window_start", hourStart)
          .order("window_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const tier = tierData?.tier ?? "analyst";
      const fallback = RATE_LIMIT_DEFAULTS[tier] ?? RATE_LIMIT_DEFAULTS.analyst;
      return {
        tier,
        todayUsed: usageTodayRes.count ?? 0,
        dayLimit: entitlementsRes.data?.daily_limit ?? fallback,
        monthLimit: entitlementsRes.data?.monthly_limit ?? null,
        currentHourRequests: rateRes.data?.request_count ?? 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const createKey = useMutation({
    mutationFn: async (payload: { name: string; expiresAt: string | null }) => {
      const rawKey = generateApiKey();
      const hash = await hashKey(rawKey);
      const prefix = rawKey.substring(0, 8);

      const { data: keyData, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user!.id,
          name: payload.name,
          scopes: ["read"],
          expires_at: payload.expiresAt,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: secretError } = await supabase.functions.invoke("store-api-secret", {
        body: { api_key_id: keyData.id, key_hash: hash, key_prefix: prefix },
      });
      if (secretError) throw secretError;

      return { rawKey, prefix };
    },
    onSuccess: ({ rawKey }) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(rawKey);
      setKeyName("");
      toast({ title: "API key created", description: "Copy it now — it won't be shown again." });
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  const toggleKey = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const rotateKey = useMutation({
    mutationFn: async (key: { id: string; name: string }) => {
      const expiresAt = keyExpiresInDays === "never"
        ? null
        : new Date(Date.now() + Number(keyExpiresInDays) * 24 * 60 * 60 * 1000).toISOString();

      await toggleKey.mutateAsync({ id: key.id, is_active: false });
      return createKey.mutateAsync({ name: `${key.name} (rotated)`, expiresAt });
    },
    onSuccess: () => {
      toast({ title: "Key rotated", description: "Old key disabled and replacement created." });
    },
  });

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const limitProgress = useMemo(() => {
    if (!usageOverview?.dayLimit) return 0;
    return Math.min((usageOverview.todayUsed / usageOverview.dayLimit) * 100, 100);
  }, [usageOverview]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> New Key
        </button>
      </div>

      {usageOverview && (
        <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-foreground font-medium"><Gauge className="h-3.5 w-3.5" /> API usage today</div>
            <span className="text-muted-foreground">{usageOverview.todayUsed} / {usageOverview.dayLimit} ({usageOverview.tier})</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full rounded-full ${limitProgress > 90 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${limitProgress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> Current hour requests: {usageOverview.currentHourRequests}</span>
            {usageOverview.monthLimit ? <span>Monthly cap: {usageOverview.monthLimit}</span> : <span>Monthly cap: plan-based</span>}
          </div>
        </div>
      )}

      {newKey && (
        <div className="p-3 rounded-md border border-warning/30 bg-warning/5 space-y-2 animate-fade-in">
          <p className="text-xs text-warning font-medium">⚠️ Copy this key now — it won't be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-foreground bg-secondary px-3 py-2 rounded break-all">{newKey}</code>
            <button onClick={() => copyToClipboard(newKey)} className="p-2 rounded hover:bg-secondary text-muted-foreground">
              {copiedKey ? <Eye className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {showCreate && !newKey && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 animate-fade-in">
          <input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. 'Production API')"
            className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={keyExpiresInDays}
            onChange={(e) => setKeyExpiresInDays(e.target.value)}
            className="h-9 px-2 rounded-md bg-secondary border border-border text-xs text-foreground"
          >
            <option value="30">Expires in 30 days</option>
            <option value="90">Expires in 90 days</option>
            <option value="180">Expires in 180 days</option>
            <option value="never">No expiry</option>
          </select>
          <button
            onClick={() => {
              if (!keyName.trim()) return;
              const expiresAt = keyExpiresInDays === "never"
                ? null
                : new Date(Date.now() + Number(keyExpiresInDays) * 24 * 60 * 60 * 1000).toISOString();
              createKey.mutate({ name: keyName.trim(), expiresAt });
            }}
            disabled={!keyName.trim() || createKey.isPending}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 justify-center"
          >
            {createKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
        ) : keys && keys.length > 0 ? (
          keys.map((k) => {
            const isExpired = !!k.expires_at && new Date(k.expires_at) < new Date();
            return (
              <div key={k.id} className="p-2 rounded bg-secondary/50 group space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.is_active && !isExpired ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {k.is_active && !isExpired ? "Active" : isExpired ? "Expired" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {k.key_prefix}•••• • Created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                      {k.last_used_at && ` · Last used ${formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}`}
                    </p>
                    {k.expires_at && (
                      <p className="text-[10px] text-muted-foreground">Expires {formatDistanceToNow(new Date(k.expires_at), { addSuffix: true })}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleKey.mutate({ id: k.id, is_active: !k.is_active })}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                      title={k.is_active ? "Disable" : "Enable"}
                    >
                      {k.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => rotateKey.mutate({ id: k.id, name: k.name })}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                      title="Rotate"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteKey.mutate(k.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">No API keys yet</p>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p><strong className="text-foreground">Endpoint:</strong> <code className="font-mono">GET /functions/v1/api-access?action=companies</code></p>
        <p><strong className="text-foreground">Auth:</strong> <code className="font-mono">Authorization: Bearer lpi_...</code></p>
        <p><strong className="text-foreground">Pagination:</strong> <code className="font-mono">limit</code> (max 500), <code className="font-mono">offset</code></p>
      </div>
    </div>
  );
};

export default ApiKeyManager;
