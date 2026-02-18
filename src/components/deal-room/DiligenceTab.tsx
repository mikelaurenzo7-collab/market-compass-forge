import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Upload, AlertTriangle, TrendingUp, BarChart3, Link, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import InspectionGallery from "./InspectionGallery";

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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      {/* Inspection Gallery (Asset mode) */}
      {dealMode === "asset" && dealId && companyId && (
        <InspectionGallery dealId={dealId} companyId={companyId} />
      )}
      {/* Documents section */}
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
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Upload CIMs, financials, rent rolls, and other diligence materials</p>
          </div>
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
                    <td className="text-right px-4 py-2 font-mono text-foreground">{f.revenue ? `$${(f.revenue / 1e6).toFixed(1)}M` : "—"}</td>
                    <td className="text-right px-4 py-2 font-mono text-foreground">{f.ebitda ? `$${(f.ebitda / 1e6).toFixed(1)}M` : "—"}</td>
                    <td className="text-right px-4 py-2 font-mono text-foreground">{f.gross_margin ? `${(f.gross_margin * 100).toFixed(1)}%` : "—"}</td>
                    <td className="text-right px-4 py-2 font-mono text-foreground">{f.arr ? `$${(f.arr / 1e6).toFixed(1)}M` : "—"}</td>
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
