import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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

const ApiKeyManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const createKey = useMutation({
    mutationFn: async (name: string) => {
      const rawKey = generateApiKey();
      const hash = await hashKey(rawKey);
      const prefix = rawKey.substring(0, 8);

      // Insert the key metadata (no sensitive fields)
      const { data: keyData, error } = await supabase.from("api_keys" as any).insert({
        user_id: user!.id,
        name,
        scopes: ["read"],
      } as any).select("id").single();
      if (error) throw error;

      // Store hash/prefix in secure table via edge function
      const { error: secretError } = await supabase.functions.invoke("store-api-secret", {
        body: { api_key_id: (keyData as any).id, key_hash: hash, key_prefix: prefix },
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
      const { error } = await supabase.from("api_keys" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  const toggleKey = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_keys" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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

      {/* New key reveal */}
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

      {/* Create form */}
      {showCreate && !newKey && (
        <div className="flex gap-2 animate-fade-in">
          <input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. 'Production API')"
            className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => keyName.trim() && createKey.mutate(keyName.trim())}
            disabled={!keyName.trim() || createKey.isPending}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
          >
            {createKey.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
          </button>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
        ) : keys && keys.length > 0 ? (
          keys.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between p-2 rounded bg-secondary/50 group">
              <div>
                <p className="text-sm font-medium text-foreground">{k.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                  {k.last_used_at && ` · Last used ${formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}`}
                </p>
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
                  onClick={() => deleteKey.mutate(k.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">No API keys yet</p>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p><strong className="text-foreground">Endpoint:</strong> <code className="font-mono">POST /functions/v1/api-access</code></p>
        <p><strong className="text-foreground">Auth:</strong> <code className="font-mono">Authorization: Bearer lpi_...</code></p>
        <p><strong className="text-foreground">Actions:</strong> <code className="font-mono">companies</code>, <code className="font-mono">financials</code>, <code className="font-mono">funding</code></p>
      </div>
    </div>
  );
};

export default ApiKeyManager;
