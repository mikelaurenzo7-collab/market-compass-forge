import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, User, Shield, Users, Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const ROLE_LABELS: Record<string, string> = {
  analyst: "Analyst",
  associate: "Associate",
  partner: "Partner",
  admin: "Admin",
};

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.display_name) setDisplayName(data.display_name);
      return data;
    },
    enabled: !!user,
  });

  const { data: role } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? "analyst";
    },
    enabled: !!user,
  });

  const { data: teamActivity } = useQuery({
    queryKey: ["team-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_activity")
        .select("*, profiles:user_id(display_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Account and workspace preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Profile</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email</label>
              <p className="text-sm text-foreground font-mono">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Display Name</label>
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {updateProfile.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Role & Permissions</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Current Role</label>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground">
              {ROLE_LABELS[role ?? "analyst"] ?? "Analyst"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Analyst:</strong> View data, add notes, manage personal pipeline</p>
            <p><strong className="text-foreground">Associate:</strong> + Create shared watchlists, export data</p>
            <p><strong className="text-foreground">Partner:</strong> + Generate memos, manage team alerts</p>
            <p><strong className="text-foreground">Admin:</strong> + Manage team roles, workspace settings</p>
          </div>
        </div>
      </div>

      {/* Team Activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Activity</h3>
        </div>
        <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
          {teamActivity && teamActivity.length > 0 ? teamActivity.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-semibold text-accent-foreground shrink-0 mt-0.5">
                {((a as any).profiles?.display_name ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{(a as any).profiles?.display_name ?? "User"}</span>
                  {" "}{a.action}{" "}
                  {a.entity_name && <span className="text-primary">{a.entity_name}</span>}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-sm text-muted-foreground">No team activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
