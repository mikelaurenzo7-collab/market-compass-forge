import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Shield, Users, Loader2, Save, Monitor, Upload, Key, Mail, LogOut, CreditCard, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ApiKeyManager from "@/components/ApiKeyManager";
import DataIngestion from "@/components/DataIngestion";
import BriefingSettings from "@/components/BriefingSettings";
import TeamManager from "@/components/TeamManager";
import DataSourcesPanel from "@/components/DataSourcesPanel";
import UsageAnalytics from "@/components/UsageAnalytics";
import PageTransition from "@/components/PageTransition";
import { AnimatedTabContent } from "@/components/AnimatedTabs";

const ROLE_LABELS: Record<string, string> = {
  analyst: "Analyst",
  associate: "Associate",
  partner: "Partner",
  admin: "Admin",
};

const DENSITY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
] as const;

const Settings = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [density, setDensity] = useState(() => localStorage.getItem("ui-density") ?? "comfortable");
  const [activeTab, setActiveTab] = useState<"profile" | "usage" | "briefing" | "api" | "data" | "sources" | "team">("profile");

  useEffect(() => {
    localStorage.setItem("ui-density", density);
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

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

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "usage" as const, label: "Usage", icon: Activity },
    { id: "briefing" as const, label: "Briefing", icon: Mail },
    { id: "api" as const, label: "API Access", icon: Key },
    { id: "data" as const, label: "Data Import", icon: Upload },
    { id: "sources" as const, label: "Data Sources", icon: Monitor },
    { id: "team" as const, label: "Team", icon: Users },
  ];

  return (
    <PageTransition>
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Account, API access, data management & team</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatedTabContent activeKey={activeTab}>
      {activeTab === "profile" && (
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
              <p><strong className="text-foreground">Admin:</strong> + Manage team roles, workspace settings, API keys</p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Current Plan</h3>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Professional — $599/mo
              </span>
              <p className="text-xs text-muted-foreground mt-2">
                Full access to all platform features. 200 AI queries, 100 memos, 100 enrichments per day. REST API included.
              </p>
              <a
                href="mailto:sales@grapevine.io?subject=Enterprise%20Inquiry"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-3 w-3" />
                Enterprise? Contact Us
              </a>
            </div>
          </div>

          {/* Display Density */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Display Density</h3>
            </div>
            <div className="flex gap-2">
              {DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDensity(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    density === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Session</h3>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 rounded-md bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {activeTab === "usage" && <UsageAnalytics />}

      {activeTab === "briefing" && <BriefingSettings />}

      {activeTab === "api" && <ApiKeyManager />}

      {activeTab === "data" && <DataIngestion />}

      {activeTab === "sources" && <DataSourcesPanel />}

      {activeTab === "team" && <TeamManager />}
      </AnimatedTabContent>
    </div>
    </PageTransition>
  );
};

export default Settings;
