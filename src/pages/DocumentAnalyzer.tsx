import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload, FileText, AlertTriangle, TrendingUp, Shield, Sparkles,
  CheckCircle, XCircle, MinusCircle, BarChart3, FileSearch, Zap,
  Loader2, Clock, Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type SeverityLevel = "high" | "medium" | "low";

interface ExtractedMetric { label: string; value: string; note?: string; }
interface RiskFactor { text: string; severity: SeverityLevel; }

const SeverityBadge = ({ severity }: { severity: SeverityLevel }) => {
  const config = {
    high: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
    medium: { icon: MinusCircle, className: "bg-warning/10 text-warning" },
    low: { icon: CheckCircle, className: "bg-muted text-muted-foreground" },
  };
  const { icon: Icon, className } = config[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${className}`}>
      <Icon className="h-3 w-3" />
      {severity}
    </span>
  );
};

const AnalysisResults = ({ data }: { data: any }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="rounded-lg border border-primary/30 bg-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{data.company_name}</p>
          <p className="text-xs text-muted-foreground">{data.document_type}{data.page_count ? ` · ${data.page_count} pages analyzed` : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">AI Analysis Complete</span>
      </div>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Executive Summary</h3>
      </div>
      <p className="text-sm text-secondary-foreground leading-relaxed">{data.ai_summary}</p>
    </div>

    {data.extracted_metrics && (data.extracted_metrics as ExtractedMetric[]).length > 0 && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Extracted Key Metrics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {(data.extracted_metrics as ExtractedMetric[]).map((m) => (
            <div key={m.label} className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
              <p className="text-lg font-mono font-semibold text-foreground">{m.value}</p>
              {m.note && <p className="text-[11px] text-muted-foreground mt-0.5">{m.note}</p>}
            </div>
          ))}
        </div>
      </div>
    )}

    {data.risk_factors && (data.risk_factors as RiskFactor[]).length > 0 && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Risk Factors Identified</h3>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">{(data.risk_factors as RiskFactor[]).length} identified</span>
        </div>
        <div className="divide-y divide-border/50">
          {(data.risk_factors as RiskFactor[]).map((r, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <SeverityBadge severity={r.severity} />
              <p className="text-sm text-secondary-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {data.valuation_indicators && (data.valuation_indicators as string[]).length > 0 && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Valuation Indicators</h3>
        </div>
        <div className="p-4 space-y-2">
          {(data.valuation_indicators as string[]).map((v, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <p className="text-sm text-secondary-foreground">{v}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {data.key_terms && (data.key_terms as { label: string; value: string }[]).length > 0 && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Key Deal Terms</h3>
        </div>
        <div className="divide-y divide-border/50">
          {(data.key_terms as { label: string; value: string }[]).map((t) => (
            <div key={t.label} className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-sm font-mono font-medium text-foreground">{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const DocumentAnalyzer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll active analysis
  const { data: analysis } = useQuery({
    queryKey: ["document-analysis", activeAnalysisId],
    queryFn: async () => {
      if (!activeAnalysisId) return null;
      const { data, error } = await supabase
        .from("document_analyses")
        .select("*")
        .eq("id", activeAnalysisId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeAnalysisId,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && (d as any)?.status === "complete") return false;
      if (d && (d as any)?.status === "error") return false;
      return 2000;
    },
  });

  // History of analyses
  const { data: history } = useQuery({
    queryKey: ["document-analyses-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Please sign in to analyze documents", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      // 1. Upload file to storage
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;
      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from("document-uploads")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(50);

      // 2. Create analysis record
      const { data: record, error: insertError } = await supabase
        .from("document_analyses")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: storagePath,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setUploadProgress(70);
      setActiveAnalysisId(record.id);

      // 3. Try to read text content for text-based files
      let fileContent = "";
      const textTypes = [".txt", ".csv", ".md", ".json", ".xml"];
      if (textTypes.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        try {
          fileContent = await file.text();
        } catch { /* binary file */ }
      }

      // 4. Trigger analysis edge function
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          analysis_id: record.id,
          file_name: file.name,
          file_content: fileContent ? fileContent.substring(0, 30000) : undefined,
          storage_path: storagePath,
        }),
      });

      setUploadProgress(100);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      queryClient.invalidateQueries({ queryKey: ["document-analyses-history"] });
      toast({ title: "Analysis complete", description: `${file.name} has been analyzed.` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const isProcessing = isUploading || (analysis && (analysis as any).status === "processing");
  const analysisData = analysis && (analysis as any).status === "complete" ? analysis : null;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors p-12 text-center ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-card"
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {isUploading ? "Uploading & analyzing..." : "AI is analyzing your document..."}
            </p>
            <p className="text-xs text-muted-foreground">Extracting metrics, risks, and deal terms</p>
            {uploadProgress > 0 && (
              <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className={`h-10 w-10 mx-auto mb-4 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium text-foreground mb-1">Drag & drop CIMs, PPMs, 10-Ks or pitch decks</p>
            <p className="text-xs text-muted-foreground mb-4">Our AI extracts key terms, financials and actionable insights. Supports PDF, DOCX, XLSX, TXT (max 20MB)</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Browse Files
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.xlsx,.txt,.csv" />
            </div>
          </>
        )}
      </div>

      {/* Supported document types */}
      {!analysisData && !isProcessing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "CIM / Offering Memo", desc: "Extract key deal terms and financials" },
            { icon: Shield, label: "PPM / Fund Docs", desc: "Parse fund terms, fees, and strategy" },
            { icon: BarChart3, label: "10-K / Annual Report", desc: "Financial statements and MD&A" },
            { icon: Zap, label: "Pitch Deck / Teaser", desc: "Company overview and projections" },
          ].map((t) => (
            <div key={t.label} className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <t.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Analysis Results */}
      {analysisData && <AnalysisResults data={analysisData} />}

      {/* Actions */}
      {analysisData && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveAnalysisId(null)}
            className="h-9 px-4 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Analyze Another Document
          </button>
        </div>
      )}

      {/* ── Analysis History ── */}
      {history && history.length > 0 && !analysisData && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Analyses</h3>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">{history.length} total</span>
          </div>
          <div className="divide-y divide-border/50">
            {history.map((item: any) => (
              <button
                key={item.id}
                onClick={() => setActiveAnalysisId(item.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.company_name && `${item.company_name} · `}
                    {item.document_type && `${item.document_type} · `}
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  item.status === "complete" ? "bg-primary/10 text-primary border-primary/20" :
                  item.status === "error" ? "bg-destructive/10 text-destructive border-destructive/20" :
                  "bg-warning/10 text-warning border-warning/20"
                }`}>
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;
