import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Shield, Clock, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

const ExternalPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Validate invite token
  const { data: invite, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: ["external-invite", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const { data, error } = await supabase
        .from("data_room_invites")
        .select("*, companies(id, name, sector)")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Invalid or expired link");
      if (data.revoked_at) throw new Error("This link has been revoked");
      if (new Date(data.expires_at) < new Date()) throw new Error("This link has expired");
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const companyId = (invite?.companies as any)?.id;
  const companyName = (invite?.companies as any)?.name;

  // Fetch documents for this company (public read via anon)
  const { data: documents } = useQuery({
    queryKey: ["external-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("id, file_name, document_type, version, created_at, file_url")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invite || !companyId) return;
    if ((invite.upload_count ?? 0) >= (invite.max_uploads ?? 20)) {
      toast.error("Upload limit reached for this invite");
      return;
    }
    setUploading(true);
    try {
      const filePath = `external/${token}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("document-uploads").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("document-uploads").getPublicUrl(filePath);
      const { error: insertError } = await supabase.from("company_documents").insert({
        company_id: companyId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        document_type: "external_upload",
        uploaded_by: null,
      });
      if (insertError) throw insertError;
      // Increment upload count
      await supabase.from("data_room_invites").update({ upload_count: (invite.upload_count ?? 0) + 1 }).eq("id", invite.id);
      queryClient.invalidateQueries({ queryKey: ["external-documents", companyId] });
      queryClient.invalidateQueries({ queryKey: ["external-invite", token] });
      toast.success("Document uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Error / loading states
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">No access token was provided.</p>
        </div>
      </div>
    );
  }

  if (inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-6">
          <Shield className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">{(inviteError as Error)?.message || "This link is invalid or has expired."}</p>
          <p className="text-xs text-muted-foreground">Please contact the deal team for a new invite link.</p>
        </div>
      </div>
    );
  }

  const uploadsRemaining = (invite.max_uploads ?? 20) - (invite.upload_count ?? 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Secure Data Room</h1>
              <p className="text-xs text-muted-foreground">{companyName} · External Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
            </span>
            {invite.invited_name && (
              <span className="bg-secondary px-2 py-0.5 rounded text-foreground font-medium">
                {invite.invited_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Upload area */}
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
          <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Upload Documents</p>
          <p className="text-xs text-muted-foreground mb-4">
            Upload CIMs, financial statements, legal documents, or other diligence materials.
          </p>
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.pptx,.ppt,.txt" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || uploadsRemaining <= 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Choose File"}
          </button>
          <p className="text-[10px] text-muted-foreground mt-2">
            {uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining
          </p>
        </div>

        {/* Documents list */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Documents ({documents?.length ?? 0})
            </h3>
          </div>
          {!documents?.length ? (
            <div className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {documents.map((doc: any) => (
                <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
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
                  {doc.document_type === "external_upload" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-4/10 text-chart-4 font-medium flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" /> External
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security footer */}
        <div className="text-center pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            End-to-end encrypted · Link expires {format(new Date(invite.expires_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Powered by Grapevine OS</p>
        </div>
      </div>
    </div>
  );
};

export default ExternalPortal;
