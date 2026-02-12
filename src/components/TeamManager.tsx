import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Mail, Trash2, Loader2, Clock, CheckCircle, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  analyst: { label: "Analyst", color: "bg-blue-500/15 text-blue-400" },
  associate: { label: "Associate", color: "bg-emerald-500/15 text-emerald-400" },
  partner: { label: "Partner", color: "bg-violet-500/15 text-violet-400" },
  admin: { label: "Admin", color: "bg-amber-500/15 text-amber-400" },
};

const TeamManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");

  // Current user's role
  const { data: currentRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data?.role ?? "analyst";
    },
    enabled: !!user,
  });

  const canManageTeam = currentRole === "admin" || currentRole === "partner";

  // Fetch pending invites
  const { data: invites } = useQuery({
    queryKey: ["team-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("invited_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && canManageTeam,
  });

  // Fetch team members (all users with roles)
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .order("role");
      if (error) throw error;

      // Get profiles for each user
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return data.map((r) => ({
        ...r,
        display_name: profiles?.find((p) => p.user_id === r.user_id)?.display_name ?? "Unknown",
      }));
    },
    enabled: !!user,
  });

  // Send invite
  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!inviteEmail.trim()) throw new Error("Email is required");
      const { error } = await supabase.from("team_invites").insert({
        invited_by: user!.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
      setInviteEmail("");
      toast({ title: "Invite sent", description: `Invitation sent to ${inviteEmail}` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    },
  });

  // Delete invite
  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
      toast({ title: "Invite revoked" });
    },
  });

  // Fetch team activity
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

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
          <span className="text-xs text-muted-foreground ml-auto">{teamMembers?.length ?? 0} members</span>
        </div>
        <div className="divide-y divide-border/50">
          {teamMembers && teamMembers.length > 0 ? teamMembers.map((m) => (
            <div key={m.user_id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                {m.display_name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {m.display_name}
                  {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-1.5">(you)</span>}
                </p>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_LABELS[m.role]?.color ?? "bg-muted text-muted-foreground"}`}>
                {ROLE_LABELS[m.role]?.label ?? m.role}
              </span>
            </div>
          )) : (
            <div className="p-6 text-center text-sm text-muted-foreground">No team members found</div>
          )}
        </div>
      </div>

      {/* Invite Form (admin/partner only) */}
      {canManageTeam && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Invite Team Member</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@firm.com"
              className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="analyst">Analyst</option>
              <option value="associate">Associate</option>
              <option value="partner">Partner</option>
              {currentRole === "admin" && <option value="admin">Admin</option>}
            </select>
            <button
              onClick={() => sendInvite.mutate()}
              disabled={sendInvite.isPending || !inviteEmail.trim()}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {sendInvite.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
              Send Invite
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            The invited user will need to sign up with this email address to join the team.
          </p>
        </div>
      )}

      {/* Pending Invites */}
      {canManageTeam && invites && invites.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Pending Invites</h3>
          </div>
          <div className="divide-y divide-border/50">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-mono truncate">{inv.email}</p>
                  <span className="text-[10px] text-muted-foreground">
                    Invited {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                  </span>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_LABELS[inv.role]?.color ?? "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[inv.role]?.label ?? inv.role}
                </span>
                {inv.status === "accepted" ? (
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <button
                    onClick={() => deleteInvite.mutate(inv.id)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
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

export default TeamManager;
