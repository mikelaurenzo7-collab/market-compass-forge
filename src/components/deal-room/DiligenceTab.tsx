import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileText, Upload, AlertTriangle, TrendingUp, BarChart3, Link, Loader2, ExternalLink, Copy, Check, Clock, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { formatCurrencyCompact, formatPercent } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import InspectionGallery from "./InspectionGallery";
import FieldMode from "./FieldMode";

interface DiligenceTabProps {
  documents: any[];
  financials: any[];
  enrichments: any[];
  companyName?: string;
  companyId?: string;
  dealId?: string;
  dealMode?: string;
}

const DiligenceTab = ({ documents, financials, enrichments, companyName, companyId, dealId, dealMode }: DiligenceTabProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteExpDays, setInviteExpDays] = useState(7);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch existing invites
  const { data: invites } = useQuery({
    queryKey: ["data-room-invites", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_invites")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const createInvite = async () => {
    if (!user || !dealId || !companyId) return;
    setCreatingInvite(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + inviteExpDays);
      const { data, error } = await supabase.from("data_room_invites").insert({
        deal_id: dealId,
        company_id: companyId,
        created_by: user.id,
        invited_name: inviteName || null,
        invited_email: inviteEmail || null,
        expires_at: expiresAt.toISOString(),
      }).select().single();
      if (error) throw error;
      const link = `${window.location.origin}/external-portal?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      queryClient.invalidateQueries({ queryKey: ["data-room-invites", dealId] });
      toast.success("Invite link created and copied to clipboard");
      setInviteName("");
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from("data_room_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId);
    if (error) { toast.error("Failed to revoke"); return; }
    queryClient.invalidateQueries({ queryKey: ["data-room-invites", dealId] });
    toast.success("Invite revoked");
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/external-portal?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    toast.success("Link copied");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !companyId) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("document-uploads").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("document-uploads").getPublicUrl(filePath);
      const { error: insertError } = await supabase.from("company_documents").insert({
        company_id: companyId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        document_type: file.name.endsWith(".pdf") ? "cim" : "financial_statement",
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["deal-documents", companyId] });
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Mobile Field Mode */}
      {isMobile && dealId && companyId && (
        <FieldMode dealId={dealId} companyId={companyId} />
      )}

      {/* Inspection Gallery (Asset mode) */}
      {dealMode === "asset" && dealId && companyId && (
        <InspectionGallery dealId={dealId} companyId={companyId} />
      )}
      {/* Documents section */}
      {/* Invite External Contributor button */}
      {dealId && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">External Data Room</p>
            <p className="text-xs text-muted-foreground">Invite lawyers, sellers, or advisors to upload documents securely</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Invite External Contributor
          </button>
        </div>
      )}

      {/* Active Invites */}
      {invites && invites.filter(i => !i.revoked_at && new Date(i.expires_at) > new Date()).length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Invite Links</h3>
          </div>
          <div className="divide-y divide-border/50">
            {invites.filter(i => !i.revoked_at && new Date(i.expires_at) > new Date()).map((inv: any) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3 w-3 text-primary" />
                  <span className="font-medium text-foreground">{inv.invited_name || inv.invited_email || "Anonymous"}</span>
                  <span className="text-muted-foreground">· {inv.upload_count ?? 0} uploads</span>
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copyLink(inv.token)} className="h-6 px-2 rounded border border-border text-[10px] hover:bg-secondary transition-colors flex items-center gap-1">
                    {copiedLink?.includes(inv.token) ? <Check className="h-2.5 w-2.5 text-success" /> : <Copy className="h-2.5 w-2.5" />} Copy
                  </button>
                  <button onClick={() => revokeInvite(inv.id)} className="h-6 px-2 rounded border border-destructive/30 text-destructive text-[10px] hover:bg-destructive/10 transition-colors flex items-center gap-1">
                    <X className="h-2.5 w-2.5" /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Invite External Contributor</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Generate a secure, time-limited link. The recipient will only see uploaded files — no valuations, allocations, or internal discussions.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Name (optional)</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Jane Smith" className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Email (optional)</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. jane@lawfirm.com" className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Link expires in</label>
                <select value={inviteExpDays} onChange={e => setInviteExpDays(Number(e.target.value))} className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground">
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>
            <button
              onClick={createInvite}
              disabled={creatingInvite}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Generate Secure Link
            </button>
            {copiedLink && (
              <div className="bg-success/10 border border-success/20 rounded-md p-3 text-center">
                <p className="text-xs font-medium text-success flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Link copied to clipboard!</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">{copiedLink}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Documents ({documents.length})
          </h3>
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,.csv" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Diligence Documents Found"
            description="Upload your first PDF to begin extraction. CIMs, financials, rent rolls, and other diligence materials will be analyzed automatically."
            actionLabel="Upload Document"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="divide-y divide-border/50">
            {documents.map((doc: any) => (
              <div key={doc.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{doc.document_type}</span>
                      <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.ai_summary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">AI Summary</span>}
                  {doc.red_flags && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Flags</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrichment data */}
      {enrichments.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Research & Enrichments ({enrichments.length})
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {enrichments.map((e: any) => (
              <div key={e.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{e.title ?? e.source_name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    e.confidence_score === "high" ? "bg-success/10 text-success" :
                    e.confidence_score === "medium" ? "bg-warning/10 text-warning" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {e.confidence_score}
                  </span>
                </div>
                {e.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.summary}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{e.data_type} · {e.source_name}</span>
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                      <Link className="h-2.5 w-2.5" /> Source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials history */}
      {financials.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Financial History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Period</th>
                  <th className="text-right px-4 py-2 font-medium">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium">EBITDA</th>
                  <th className="text-right px-4 py-2 font-medium">Gross Margin</th>
                  <th className="text-right px-4 py-2 font-medium">ARR</th>
                </tr>
              </thead>
              <tbody>
                {financials.map((f: any) => (
                  <tr key={f.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-medium text-foreground">{f.period}</td>
                    <td className="text-right px-4 py-2 font-mono tabular-nums text-foreground">{formatCurrencyCompact(f.revenue)}</td>
                    <td className="text-right px-4 py-2 font-mono tabular-nums text-foreground">{formatCurrencyCompact(f.ebitda)}</td>
                    <td className="text-right px-4 py-2 font-mono tabular-nums text-foreground">{f.gross_margin ? formatPercent(f.gross_margin * 100, 1) : "—"}</td>
                    <td className="text-right px-4 py-2 font-mono tabular-nums text-foreground">{formatCurrencyCompact(f.arr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk flags */}
      <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Risk Assessment
        </h3>
        <p className="text-xs text-muted-foreground">AI risk analysis will populate automatically as documents are uploaded and analyzed.</p>
      </div>
    </div>
  );
};

export default DiligenceTab;
