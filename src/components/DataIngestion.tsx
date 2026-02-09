import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Check, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ParsedRow = Record<string, string>;

const FIELD_MAP: Record<string, string> = {
  name: "name",
  company: "name",
  company_name: "name",
  sector: "sector",
  industry: "sector",
  stage: "stage",
  funding_stage: "stage",
  country: "hq_country",
  hq_country: "hq_country",
  hq: "hq_country",
  city: "hq_city",
  hq_city: "hq_city",
  domain: "domain",
  website: "domain",
  employees: "employee_count",
  employee_count: "employee_count",
  headcount: "employee_count",
  founded: "founded_year",
  founded_year: "founded_year",
  description: "description",
};

const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  
  return { headers, rows };
};

const DataIngestion = () => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setParsed(result);

      // Auto-map columns
      const autoMap: Record<string, string> = {};
      result.headers.forEach((h) => {
        const normalized = h.replace(/[\s_-]/g, "_").toLowerCase();
        if (FIELD_MAP[normalized]) {
          autoMap[h] = FIELD_MAP[normalized];
        }
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No data");

      const companies = parsed.rows
        .filter((row) => {
          const nameField = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
          return nameField && row[nameField]?.trim();
        })
        .map((row) => {
          const record: Record<string, any> = {};
          Object.entries(mapping).forEach(([csvCol, dbField]) => {
            let val: any = row[csvCol]?.trim();
            if (!val) return;
            if (dbField === "employee_count" || dbField === "founded_year") {
              val = parseInt(val, 10);
              if (isNaN(val)) return;
            }
            record[dbField] = val;
          });
          return record;
        })
        .filter((r) => r.name);

      if (companies.length === 0) throw new Error("No valid companies found");

      // Insert in batches of 50
      for (let i = 0; i < companies.length; i += 50) {
        const batch = companies.slice(i, i + 50);
        const { error } = await supabase.from("companies").insert(batch as any);
        if (error) throw error;
      }

      return companies.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-with-financials"] });
      toast({ title: `${count} companies imported`, description: "Data is now available across the platform." });
      setParsed(null);
      setMapping({});
      setFileName("");
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const dbFields = ["name", "sector", "stage", "hq_country", "hq_city", "domain", "employee_count", "founded_year", "description"];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Import Companies</h3>
      </div>

      {!parsed ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Drop a CSV file or click to upload</p>
          <p className="text-[10px] text-muted-foreground mt-1">Columns: name, sector, stage, country, employees, founded, domain</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">{fileName} — {parsed.rows.length} rows</span>
            </div>
            <button onClick={() => { setParsed(null); setMapping({}); setFileName(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Column mapping */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Map CSV columns to fields:</p>
            <div className="grid grid-cols-2 gap-2">
              {parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-xs text-foreground font-mono w-28 truncate">{h}</span>
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                    className="h-7 px-2 rounded bg-secondary border border-border text-xs text-foreground flex-1"
                  >
                    <option value="">Skip</option>
                    {dbFields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="overflow-x-auto max-h-40 rounded border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/30">
                  {parsed.headers.filter((h) => mapping[h]).map((h) => (
                    <th key={h} className="px-2 py-1 text-left text-muted-foreground font-medium">{mapping[h]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {parsed!.headers.filter((h) => mapping[h]).map((h) => (
                      <td key={h} className="px-2 py-1 text-foreground">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!Object.values(mapping).includes("name") && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> A "name" column mapping is required
            </div>
          )}

          <button
            onClick={() => importMutation.mutate()}
            disabled={!Object.values(mapping).includes("name") || importMutation.isPending}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {parsed.rows.length} Companies
          </button>
        </div>
      )}
    </div>
  );
};

export default DataIngestion;
