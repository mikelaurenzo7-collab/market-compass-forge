import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Check, AlertCircle, Loader2, X, Download, Clock, Building2, DollarSign, Handshake, Users, Briefcase, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/PageHeader";

type ParsedRow = Record<string, string>;

interface EntityConfig {
  key: string;
  label: string;
  icon: typeof Building2;
  table: string;
  fields: { csv: string; db: string; label: string; required?: boolean; type?: string }[];
  resolveCompany?: boolean;
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: "companies", label: "Companies", icon: Building2, table: "companies",
    fields: [
      { csv: "name", db: "name", label: "Company Name", required: true },
      { csv: "sector", db: "sector", label: "Sector" },
      { csv: "stage", db: "stage", label: "Stage" },
      { csv: "hq_country", db: "hq_country", label: "Country" },
      { csv: "domain", db: "domain", label: "Website" },
      { csv: "employee_count", db: "employee_count", label: "Employees", type: "number" },
      { csv: "founded_year", db: "founded_year", label: "Founded Year", type: "number" },
      { csv: "description", db: "description", label: "Description" },
    ],
  },
  {
    key: "financials", label: "Financials", icon: DollarSign, table: "financials", resolveCompany: true,
    fields: [
      { csv: "company_name", db: "company_name", label: "Company Name", required: true },
      { csv: "period", db: "period", label: "Period (e.g. 2024)", required: true },
      { csv: "revenue", db: "revenue", label: "Revenue", type: "number" },
      { csv: "arr", db: "arr", label: "ARR", type: "number" },
      { csv: "ebitda", db: "ebitda", label: "EBITDA", type: "number" },
      { csv: "gross_margin", db: "gross_margin", label: "Gross Margin %", type: "number" },
      { csv: "burn_rate", db: "burn_rate", label: "Burn Rate", type: "number" },
    ],
  },
  {
    key: "deals", label: "Deals", icon: Handshake, table: "deal_transactions",
    fields: [
      { csv: "target_company", db: "target_company", label: "Target Company", required: true },
      { csv: "deal_type", db: "deal_type", label: "Deal Type", required: true },
      { csv: "deal_value", db: "deal_value", label: "Deal Value", type: "number" },
      { csv: "announced_date", db: "announced_date", label: "Date" },
      { csv: "acquirer_investor", db: "acquirer_investor", label: "Buyer / Investor" },
      { csv: "target_industry", db: "target_industry", label: "Industry" },
    ],
  },
  {
    key: "contacts", label: "Contacts", icon: Users, table: "key_personnel", resolveCompany: true,
    fields: [
      { csv: "name", db: "name", label: "Full Name", required: true },
      { csv: "title", db: "title", label: "Title" },
      { csv: "company_name", db: "company_name", label: "Company Name" },
      { csv: "email", db: "email", label: "Email" },
      { csv: "phone", db: "phone", label: "Phone" },
      { csv: "linkedin_url", db: "linkedin_url", label: "LinkedIn URL" },
    ],
  },
];

const splitCSVLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
};

const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]/g, "_"));
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i]);
    const row: ParsedRow = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
};

const generateTemplate = (config: EntityConfig) => {
  const headers = config.fields.map((f) => f.csv).join(",");
  const blob = new Blob([headers + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.key}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Auto-map CSV headers to DB fields
const autoMap = (headers: string[], config: EntityConfig): Record<string, string> => {
  const map: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    name: ["name", "company", "company_name", "full_name"],
    target_company: ["target_company", "target", "company_name", "company"],
    company_name: ["company_name", "company", "name"],
    sector: ["sector", "industry"],
    stage: ["stage", "funding_stage"],
    hq_country: ["hq_country", "country", "hq"],
    domain: ["domain", "website", "url"],
    employee_count: ["employee_count", "employees", "headcount"],
    founded_year: ["founded_year", "founded", "year_founded"],
    deal_type: ["deal_type", "type", "transaction_type"],
    deal_value: ["deal_value", "value", "amount", "size"],
    announced_date: ["announced_date", "date", "close_date"],
    acquirer_investor: ["acquirer_investor", "buyer", "investor", "acquirer"],
    title: ["title", "role", "position", "job_title"],
    email: ["email", "email_address"],
    phone: ["phone", "phone_number", "telephone"],
    linkedin_url: ["linkedin_url", "linkedin", "profile_url"],
    period: ["period", "year", "fiscal_year"],
    revenue: ["revenue", "total_revenue", "sales"],
    arr: ["arr", "annual_recurring_revenue"],
    ebitda: ["ebitda"],
    gross_margin: ["gross_margin", "margin"],
    burn_rate: ["burn_rate", "burn"],
    target_industry: ["target_industry", "industry", "sector"],
  };

  headers.forEach((h) => {
    const normalized = h.replace(/[\s_-]/g, "_").toLowerCase();
    for (const field of config.fields) {
      const fieldAliases = aliases[field.db] ?? [field.db];
      if (fieldAliases.includes(normalized)) {
        map[h] = field.db;
        break;
      }
    }
  });
  return map;
};

const CSVImporter = ({ config }: { config: EntityConfig }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setParsed(result);
      setMapping(autoMap(result.headers, config));
    };
    reader.readAsText(file);
  }, [config]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith(".csv")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setParsed(result);
      setMapping(autoMap(result.headers, config));
    };
    reader.readAsText(file);
  }, [config]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!parsed || !user) throw new Error("No data or not authenticated");

      const requiredFields = config.fields.filter((f) => f.required).map((f) => f.db);
      const mappedRequired = requiredFields.every((rf) => Object.values(mapping).includes(rf));
      if (!mappedRequired) throw new Error(`Required fields missing: ${requiredFields.join(", ")}`);

      // Create import history record
      const { data: importRecord, error: histError } = await supabase
        .from("import_history")
        .insert({ user_id: user.id, file_name: fileName, entity_type: config.key, row_count: parsed.rows.length, status: "processing" } as any)
        .select()
        .single();
      if (histError) throw histError;

      // Resolve company names to IDs if needed
      let companyMap: Record<string, string> = {};
      if (config.resolveCompany) {
        const companyNames = [...new Set(parsed.rows.map((r) => {
          const col = Object.entries(mapping).find(([, v]) => v === "company_name")?.[0];
          return col ? r[col]?.trim() : "";
        }).filter(Boolean))];

        if (companyNames.length > 0) {
          const { data: companies } = await supabase.from("companies").select("id, name").in("name", companyNames);
          companies?.forEach((c) => { companyMap[c.name.toLowerCase()] = c.id; });
        }
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const batchSize = 50;
      const totalBatches = Math.ceil(parsed.rows.length / batchSize);

      for (let i = 0; i < parsed.rows.length; i += batchSize) {
        const batch = parsed.rows.slice(i, i + batchSize);
        const records = batch.map((row) => {
          const record: Record<string, any> = {};
          Object.entries(mapping).forEach(([csvCol, dbField]) => {
            let val: any = row[csvCol]?.trim();
            if (!val) return;
            const fieldDef = config.fields.find((f) => f.db === dbField);
            if (fieldDef?.type === "number") {
              val = parseFloat(val);
              if (isNaN(val)) return;
            }
            record[dbField] = val;
          });

          // Resolve company_name to company_id
          if (config.resolveCompany && record.company_name) {
            const companyId = companyMap[record.company_name.toLowerCase()];
            if (companyId) {
              record.company_id = companyId;
            }
            delete record.company_name;
          }

          return record;
        }).filter((r) => {
          const requiredOk = requiredFields.every((rf) => {
            if (rf === "company_name" && config.resolveCompany) return r.company_id;
            return r[rf];
          });
          return requiredOk;
        });

        if (records.length > 0) {
          const { error } = await supabase.from(config.table as any).insert(records as any);
          if (error) {
            errorCount += records.length;
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            successCount += records.length;
          }
        }

        setProgress(Math.round(((Math.floor(i / batchSize) + 1) / totalBatches) * 100));
      }

      // Update import history
      await supabase.from("import_history").update({
        success_count: successCount,
        error_count: errorCount,
        status: errorCount === 0 ? "complete" : successCount === 0 ? "failed" : "partial",
        errors: errors as any,
      } as any).eq("id", (importRecord as any).id);

      return { successCount, errorCount, errors };
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries({ queryKey: [config.table] });
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
      if (config.key === "companies") {
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        queryClient.invalidateQueries({ queryKey: ["companies-with-financials"] });
      }
      toast({
        title: `${successCount} ${config.label.toLowerCase()} imported`,
        description: errorCount > 0 ? `${errorCount} rows failed` : "All rows imported successfully.",
        variant: errorCount > 0 ? "destructive" : "default",
      });
      reset();
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
      setProgress(0);
    },
  });

  const reset = () => { setParsed(null); setMapping({}); setFileName(""); setProgress(0); };

  const requiredFieldsMapped = config.fields.filter((f) => f.required).every((f) => Object.values(mapping).includes(f.db));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <config.icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Import {config.label}</h3>
        </div>
        <button
          onClick={() => generateTemplate(config)}
          className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
        >
          <Download className="h-3 w-3" /> Download Template
        </button>
      </div>

      {!parsed ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Drop a CSV file or click to upload</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            Fields: {config.fields.map((f) => f.label).join(", ")}
          </p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">{fileName} — {parsed.rows.length} rows</span>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Column mapping */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Map CSV columns to fields:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-xs text-foreground font-mono w-32 truncate">{h}</span>
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                    className="h-7 px-2 rounded bg-secondary border border-border text-xs text-foreground flex-1"
                  >
                    <option value="">Skip</option>
                    {config.fields.map((f) => (
                      <option key={f.db} value={f.db}>{f.label}{f.required ? " *" : ""}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="overflow-x-auto max-h-44 rounded border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/30">
                  {parsed.headers.filter((h) => mapping[h]).map((h) => (
                    <th key={h} className="px-2 py-1 text-left text-muted-foreground font-medium">{config.fields.find((f) => f.db === mapping[h])?.label ?? mapping[h]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {parsed.headers.filter((h) => mapping[h]).map((h) => (
                      <td key={h} className="px-2 py-1 text-foreground">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!requiredFieldsMapped && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> Required fields must be mapped: {config.fields.filter((f) => f.required).map((f) => f.label).join(", ")}
            </div>
          )}

          {importMutation.isPending && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}

          <button
            onClick={() => importMutation.mutate()}
            disabled={!requiredFieldsMapped || importMutation.isPending}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {parsed.rows.length} {config.label}
          </button>
        </div>
      )}
    </div>
  );
};

const ImportHistory = () => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["import-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (!history?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No imports yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Upload CSV files to see your import history here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">File</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rows</th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Success</th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Errors</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h: any) => (
            <tr key={h.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-2.5 text-foreground font-mono text-xs">{h.file_name}</td>
              <td className="px-4 py-2.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{h.entity_type}</span>
              </td>
              <td className="text-right px-4 py-2.5 font-mono text-foreground">{h.row_count}</td>
              <td className="text-right px-4 py-2.5 font-mono text-success">{h.success_count}</td>
              <td className="text-right px-4 py-2.5 font-mono text-destructive">{h.error_count}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  h.status === "complete" ? "bg-success/10 text-success" :
                  h.status === "failed" ? "bg-destructive/10 text-destructive" :
                  h.status === "partial" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>{h.status}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TABS = [
  ...ENTITY_CONFIGS.map((c) => ({ key: c.key, label: c.label, icon: c.icon })),
  { key: "history", label: "History", icon: History },
];

const DataRoom = () => {
  const [activeTab, setActiveTab] = useState("companies");

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Data Room"
        subtitle="Upload and manage your proprietary data across companies, financials, deals, and contacts."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {activeTab === "history" ? (
          <ImportHistory />
        ) : (
          <CSVImporter config={ENTITY_CONFIGS.find((c) => c.key === activeTab)!} />
        )}
      </div>
    </div>
  );
};

export default DataRoom;
