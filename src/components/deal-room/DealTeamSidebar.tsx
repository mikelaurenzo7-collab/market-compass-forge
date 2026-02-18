import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDealTeam, DealRoleType } from "@/hooks/useDealTeam";
import { Users, Plus, Trash2, Loader2, Circle } from "lucide-react";
import { toast } from "sonner";

interface DealTeamSidebarProps {
  dealId: string;
  profiles: Record<string, string>;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  approver: "Approver",
  lead: "Lead",
  contributor: "Contributor",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-primary",
  approver: "text-chart-4",
  lead: "text-success",
  contributor: "text-foreground",
  viewer: "text-muted-foreground",
};

const DealTeamSidebar = ({ dealId, profiles }: DealTeamSidebarProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { team, canManageTeam, isOwner } = useDealTeam(dealId);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("contributor");
  const [adding, setAdding] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<Record<string, { name: string }>>({});

  // Realtime presence
  useEffect(() => {
    if (!dealId || !user) return;

    const channel = supabase.channel(`deal-presence-${dealId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: Record<string, { name: string }> = {};
        Object.entries(state).forEach(([uid, presences]) => {
          const p = (presences as any[])[0];
          if (p) users[uid] = { name: p.name || uid.slice(0, 8) };
        });
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: profiles[user.id] || user.email?.split("@")[0] || "User",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, user, profiles]);

  // Realtime for team changes
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase
      .channel(`deal-team-changes-${dealId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_team", filter: `deal_id=eq.${dealId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["deal-team", dealId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealId, queryClient]);

  const handleAddMember = async () => {
    if (!email.trim() || !user) return;
    setAdding(true);
    try {
      // Look up user by email in profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", email.trim())
        .limit(1);

      const targetUserId = profileData?.[0]?.user_id;
      if (!targetUserId) {
        toast.error("User not found. Enter their display name.");
        setAdding(false);
        return;
      }

      const { error } = await supabase.from("deal_team").insert({
        deal_id: dealId,
        user_id: targetUserId,
        role: role as any,
        added_by: user.id,
      } as any);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["deal-team", dealId] });
      setEmail("");
      setShowAdd(false);
      toast.success("Team member added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await supabase.from("deal_team").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["deal-team", dealId] });
      toast.success("Member removed");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from("deal_team").update({ role: newRole } as any).eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["deal-team", dealId] });
      toast.success("Role updated");
    }
  };

  // Get deal owner info
  const { data: ownerData } = (() => {
    // We already have profiles, just need the owner user_id from the deal
    return { data: null };
  })();

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" /> Deal Team
        </h3>
        {canManageTeam && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="h-6 px-2 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 flex items-center gap-1"
          >
            <Plus className="h-2.5 w-2.5" /> Add
          </button>
        )}
      </div>

      {showAdd && (
        <div className="p-3 border-b border-border bg-secondary/30 space-y-2">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Display name..."
            className="w-full h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1 h-8 px-2 rounded border border-border bg-background text-xs text-foreground"
            >
              <option value="viewer">Viewer</option>
              <option value="contributor">Contributor</option>
              <option value="lead">Lead</option>
              <option value="approver">Approver</option>
            </select>
            <button
              onClick={handleAddMember}
              disabled={adding || !email.trim()}
              className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      <div className="p-2 space-y-0.5 max-h-64 overflow-y-auto">
        {/* Owner always shown first */}
        {Object.keys(profiles).length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50">
            <div className="relative">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {(Object.values(profiles)[0] || "O")[0]?.toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {profiles[team?.[0]?.user_id] || "Deal Owner"}
              </p>
            </div>
            <span className={`text-[10px] font-medium ${ROLE_COLORS.owner}`}>{ROLE_LABELS.owner}</span>
          </div>
        )}

        {team.map((member: any) => {
          const isOnline = !!presenceUsers[member.user_id];
          const name = profiles[member.user_id] || member.user_id.slice(0, 8);

          return (
            <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 group">
              <div className="relative">
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                  {name[0]?.toUpperCase()}
                </div>
                {isOnline && (
                  <Circle className="h-2 w-2 text-success fill-success absolute -bottom-0.5 -right-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate flex items-center gap-1">
                  {name}
                  {isOnline && <span className="text-[9px] text-success font-medium">ACTIVE</span>}
                </p>
              </div>
              {canManageTeam ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="text-[10px] bg-transparent border-none text-muted-foreground cursor-pointer p-0"
                >
                  <option value="viewer">Viewer</option>
                  <option value="contributor">Contributor</option>
                  <option value="lead">Lead</option>
                  <option value="approver">Approver</option>
                </select>
              ) : (
                <span className={`text-[10px] font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[member.role] || member.role}
                </span>
              )}
              {canManageTeam && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {team.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            No team members assigned yet.
          </p>
        )}
      </div>

      {/* Presence footer */}
      {Object.keys(presenceUsers).length > 0 && (
        <div className="px-3 py-1.5 border-t border-border">
          <span className="text-[9px] text-muted-foreground">
            {Object.keys(presenceUsers).length} active now
          </span>
        </div>
      )}
    </div>
  );
};

export default DealTeamSidebar;
