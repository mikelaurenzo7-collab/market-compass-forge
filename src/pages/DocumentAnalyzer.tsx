import { useState } from "react";
import {
  Upload, FileText, AlertTriangle, TrendingUp, Shield, Sparkles,
  CheckCircle, XCircle, MinusCircle, BarChart3, FileSearch, Zap,
} from "lucide-react";

type SeverityLevel = "high" | "medium" | "low";

interface ExtractedMetric {
  label: string;
  value: string;
  note?: string;
}

interface RiskFactor {
  text: string;
  severity: SeverityLevel;
}

interface DemoAnalysis {
  companyName: string;
  documentType: string;
  pageCount: number;
  extractedMetrics: ExtractedMetric[];
  riskFactors: RiskFactor[];
  valuationIndicators: string[];
  keyTerms: { label: string; value: string }[];
  aiSummary: string;
}

const DEMO_ANALYSIS: DemoAnalysis = {
  companyName: "Apex Industrial Solutions, Inc.",
  documentType: "Confidential Information Memorandum (CIM)",
  pageCount: 87,
  extractedMetrics: [
    { label: "LTM Revenue", value: "$187.4M", note: "Period ending Q3 2025" },
    { label: "LTM EBITDA", value: "$34.2M", note: "18.3% margin" },
    { label: "Revenue Growth (3yr CAGR)", value: "14.7%", note: "Organic growth ~11%" },
    { label: "Gross Margin", value: "42.1%", note: "Expanding from 38.6% in 2022" },
    { label: "Net Debt", value: "$48.6M", note: "1.4x Net Debt/EBITDA" },
    { label: "Customer Count", value: "2,400+", note: "Top 10 = 31% of revenue" },
    { label: "Employee Count", value: "1,150", note: "Revenue/employee: $163K" },
    { label: "Capex (% Revenue)", value: "3.2%", note: "Asset-light model" },
  ],
  riskFactors: [
    { text: "Top 10 customers represent 31% of revenue — moderate concentration risk", severity: "high" },
    { text: "Pending OSHA regulatory changes could increase compliance costs by $2-4M annually", severity: "high" },
    { text: "Key-man dependency: CEO and CTO founded the business, limited succession planning documented", severity: "medium" },
    { text: "Acquisition integration — 3 bolt-on acquisitions in last 18 months, integration still in progress", severity: "medium" },
    { text: "Working capital seasonality creates Q1 cash flow trough", severity: "low" },
    { text: "Single ERP system migration underway (SAP to NetSuite), expected completion Q2 2026", severity: "low" },
  ],
  valuationIndicators: [
    "Management-implied EV/EBITDA range of 9.0x–11.0x based on comparable transactions cited",
    "Precedent transactions referenced: Danaher/Pall Corp (12.1x), Roper/CIVCO (10.8x), ITT/Wolverine (9.4x)",
    "Revenue multiple implied at 1.6x–2.0x based on projected 2026E revenue of $215M",
    "DCF terminal value assumes 3.0% perpetual growth rate and 9.5% WACC",
  ],
  keyTerms: [
    { label: "Management Rollover", value: "25-30% of equity" },
    { label: "Earnout Structure", value: "$12M over 2 years tied to EBITDA targets" },
    { label: "Non-Compete", value: "3-year, nationwide for CEO/CTO/CFO" },
    { label: "Working Capital Target", value: "$22.5M (NWC peg)" },
    { label: "Rep & Warranty Insurance", value: "Required, buyer to procure" },
    { label: "Exclusivity Period", value: "45 days from LOI execution" },
  ],
  aiSummary:
    "Apex Industrial Solutions is a well-positioned specialty industrial distributor with an attractive margin profile (18.3% EBITDA margin) and strong organic growth trajectory (~11% CAGR). The company has executed a successful buy-and-build strategy with three bolt-on acquisitions since 2023, though integration risk remains. Customer concentration is the primary concern, with the top 10 customers accounting for 31% of revenue. At the implied 9-11x EV/EBITDA valuation range, the deal appears fairly priced relative to comparable transactions in the industrial distribution space. The asset-light model (3.2% capex intensity) supports strong free cash flow conversion, making this an attractive LBO candidate with potential for 2.5-3.0x MOIC at a 5-year hold assuming continued bolt-on activity and margin expansion.",
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

const DocumentAnalyzer = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const demo = DEMO_ANALYSIS;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Document Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload CIMs, PPMs, 10-Ks, or any financial document for instant AI extraction
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); setShowDemo(true); }}
        className={`relative rounded-lg border-2 border-dashed transition-colors p-12 text-center ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-card"
        }`}
      >
        <Upload className={`h-10 w-10 mx-auto mb-4 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium text-foreground mb-1">
          Drag & drop a financial document here
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Supports PDF, DOCX, XLSX — CIM, PPM, 10-K, pitch decks, and more
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowDemo(true)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <FileSearch className="h-4 w-4" />
            View Demo Analysis
          </button>
          <button className="h-9 px-4 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Browse Files
          </button>
        </div>
      </div>

      {/* Supported document types */}
      {!showDemo && (
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

      {/* Demo Analysis Results */}
      {showDemo && (
        <div className="space-y-6 animate-fade-in">
          {/* Document Header */}
          <div className="rounded-lg border border-primary/30 bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{demo.companyName}</p>
                <p className="text-xs text-muted-foreground">{demo.documentType} · {demo.pageCount} pages analyzed</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">AI Analysis Complete</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Executive Summary</h3>
            </div>
            <p className="text-sm text-secondary-foreground leading-relaxed">{demo.aiSummary}</p>
          </div>

          {/* Extracted Metrics */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Extracted Key Metrics</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              {demo.extractedMetrics.map((m) => (
                <div key={m.label} className="p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-lg font-mono font-semibold text-foreground">{m.value}</p>
                  {m.note && <p className="text-[11px] text-muted-foreground mt-0.5">{m.note}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Factors */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Risk Factors Identified</h3>
              <span className="text-[10px] font-mono text-muted-foreground ml-auto">{demo.riskFactors.length} identified</span>
            </div>
            <div className="divide-y divide-border/50">
              {demo.riskFactors.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <SeverityBadge severity={r.severity} />
                  <p className="text-sm text-secondary-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation Indicators */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Valuation Indicators</h3>
            </div>
            <div className="p-4 space-y-2">
              {demo.valuationIndicators.map((v, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p className="text-sm text-secondary-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Terms */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Key Deal Terms</h3>
            </div>
            <div className="divide-y divide-border/50">
              {demo.keyTerms.map((t) => (
                <div key={t.label} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.label}</span>
                  <span className="text-sm font-mono font-medium text-foreground">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Investment Memo
            </button>
            <button className="h-9 px-4 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Export PDF Report
            </button>
            <button
              onClick={() => setShowDemo(false)}
              className="h-9 px-4 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Analyze Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;
