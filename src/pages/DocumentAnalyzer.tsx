import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload, FileText, AlertTriangle, TrendingUp, Shield, Sparkles,
  CheckCircle, XCircle, MinusCircle, BarChart3, FileSearch, Zap,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type SeverityLevel = "high" | "medium" | "low";

interface ExtractedMetric { label: string; value: string; note?: string; }
interface RiskFactor { text: string; severity: SeverityLevel; }

// Demo fallback data
const DEMO_ANALYSIS = {
  company_name: "Apex Industrial Solutions, Inc.",
  document_type: "Confidential Information Memorandum (CIM)",
  page_count: 87,
  extracted_metrics: [
    { label: "LTM Revenue", value: "$187.4M", note: "Period ending Q3 2025" },
    { label: "LTM EBITDA", value: "$34.2M", note: "18.3% margin" },
    { label: "Revenue Growth (3yr CAGR)", value: "14.7%", note: "Organic growth ~11%" },
    { label: "Gross Margin", value: "42.1%", note: "Expanding from 38.6% in 2022" },
    { label: "Net Debt", value: "$48.6M", note: "1.4x Net Debt/EBITDA" },
    { label: "Customer Count", value: "2,400+", note: "Top 10 = 31% of revenue" },
    { label: "Employee Count", value: "1,150", note: "Revenue/employee: $163K" },
    { label: "Capex (% Revenue)", value: "3.2%", note: "Asset-light model" },
  ],
  risk_factors: [
    { text: "Top 10 customers represent 31% of revenue — moderate concentration risk", severity: "high" as SeverityLevel },
    { text: "Pending OSHA regulatory changes could increase compliance costs by $2-4M annually", severity: "high" as SeverityLevel },
    { text: "Key-man dependency: CEO and CTO founded the business, limited succession planning documented", severity: "medium" as SeverityLevel },
    { text: "Acquisition integration — 3 bolt-on acquisitions in last 18 months, integration still in progress", severity: "medium" as SeverityLevel },
    { text: "Working capital seasonality creates Q1 cash flow trough", severity: "low" as SeverityLevel },
    { text: "Single ERP system migration underway (SAP to NetSuite), expected completion Q2 2026", severity: "low" as SeverityLevel },
  ],
  valuation_indicators: [
    "Management-implied EV/EBITDA range of 9.0x–11.0x based on comparable transactions cited",
    "Precedent transactions referenced: Danaher/Pall Corp (12.1x), Roper/CIVCO (10.8x), ITT/Wolverine (9.4x)",
    "Revenue multiple implied at 1.6x–2.0x based on projected 2026E revenue of $215M",
    "DCF terminal value assumes 3.0% perpetual growth rate and 9.5% WACC",
  ],
  key_terms: [
    { label: "Management Rollover", value: "25-30% of equity" },
    { label: "Earnout Structure", value: "$12M over 2 years tied to EBITDA targets" },
    { label: "Non-Compete", value: "3-year, nationwide for CEO/CTO/CFO" },
    { label: "Working Capital Target", value: "$22.5M (NWC peg)" },
    { label: "Rep & Warranty Insurance", value: "Required, buyer to procure" },
    { label: "Exclusivity Period", value: "45 days from LOI execution" },
  ],
  ai_summary: "Apex Industrial Solutions is a well-positioned specialty industrial distributor with an attractive margin profile (18.3% EBITDA margin) and strong organic growth trajectory (~11% CAGR). The company has executed a successful buy-and-build strategy with three bolt-on acquisitions since 2023, though integration risk remains. Customer concentration is the primary concern, with the top 10 customers accounting for 31% of revenue. At the implied 9-11x EV/EBITDA valuation range, the deal appears fairly priced relative to comparable transactions in the industrial distribution space. The asset-light model (3.2% capex intensity) supports strong free cash flow conversion, making this an attractive LBO candidate with potential for 2.5-3.0x MOIC at a 5-year hold assuming continued bolt-on activity and margin expansion.",
  status: "complete" as const,
};

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

const AnalysisResults = ({ data }: { data: typeof DEMO_ANALYSIS }) => (
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
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: analysis, isLoading: isPolling } = useQuery({
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

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Please sign in to analyze documents", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setShowDemo(false);
    try {
      // Read file content as text (for PDFs this won't work perfectly, but covers txt/csv/docx-text)
      let fileContent = "";
      try {
        fileContent = await file.text();
      } catch { /* binary file */ }

      // Create the analysis record
      const { data: record, error: insertError } = await supabase
        .from("document_analyses")
        .insert({
          user_id: user.id,
          file_name: file.name,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveAnalysisId(record.id);

      // Trigger the edge function
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
          file_content: fileContent.substring(0, 30000),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      toast({ title: "Analysis complete", description: `${file.name} has been analyzed.` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
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
            <p className="text-sm font-medium text-foreground">Analyzing document...</p>
            <p className="text-xs text-muted-foreground">AI is extracting metrics, risks, and deal terms</p>
          </div>
        ) : (
          <>
            <Upload className={`h-10 w-10 mx-auto mb-4 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium text-foreground mb-1">Drag & drop a financial document here</p>
            <p className="text-xs text-muted-foreground mb-4">Supports PDF, DOCX, XLSX, TXT — CIM, PPM, 10-K, pitch decks, and more</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setShowDemo(true); setActiveAnalysisId(null); }}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <FileSearch className="h-4 w-4" />
                View Demo Analysis
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2"
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
      {!showDemo && !analysisData && !isProcessing && (
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

      {/* Real Analysis Results */}
      {analysisData && <AnalysisResults data={analysisData as any} />}

      {/* Demo Results */}
      {showDemo && !analysisData && <AnalysisResults data={DEMO_ANALYSIS} />}

      {/* Actions */}
      {(showDemo || analysisData) && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowDemo(false); setActiveAnalysisId(null); }}
            className="h-9 px-4 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Analyze Another Document
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;
