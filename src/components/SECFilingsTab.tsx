import { useState } from "react";
import { useSECFilings, useSECFinancials, useFetchSECData } from "@/hooks/useSECFilings";
import SECFinancials from "@/components/SECFinancials";
import { DataBadge } from "@/components/DataBadges";
import { FileText, ExternalLink, Loader2, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SECFilingsTabProps {
  companyId: string;
  companyName: string;
  cikNumber?: string | null;
  marketType?: string;
}

const FILING_TYPE_COLORS: Record<string, string> = {
  "10-K": "bg-primary/10 text-primary border-primary/30",
  "10-Q": "bg-accent text-accent-foreground border-border",
  "8-K": "bg-warning/10 text-warning border-warning/30",
  "S-1": "bg-success/10 text-success border-success/30",
  "4": "bg-muted text-muted-foreground border-border",
};

const SECFilingsTab = ({ companyId, companyName, cikNumber, marketType }: SECFilingsTabProps) => {
  const { data: filings, isLoading: filingsLoading } = useSECFilings(companyId);
  const { data: financials, isLoading: financialsLoading } = useSECFinancials(companyId);
  const fetchSEC = useFetchSECData();
  const [cikInput, setCikInput] = useState("");
  const [filingFilter, setFilingFilter] = useState<string>("all");

  const hasCIK = !!cikNumber;
  const hasData = (filings?.length ?? 0) > 0 || (financials?.length ?? 0) > 0;

  const handleFetchSEC = () => {
    const cik = cikInput.trim();
    if (!cik) {
      toast.error("Please enter a CIK number");
      return;
    }
    toast.info(`Fetching SEC data for CIK ${cik}...`);
    fetchSEC.mutate(
      { companyId, cik, action: "all" },
      {
        onSuccess: () => toast.success("SEC data loaded successfully"),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  const filteredFilings = filings?.filter(
    (f) => filingFilter === "all" || f.filing_type === filingFilter
  );

  const uniqueTypes = [...new Set(filings?.map((f) => f.filing_type) ?? [])].sort();

  if (!hasCIK && !hasData) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-4">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Connect SEC EDGAR Data</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the company's CIK number to pull real filings and financials from the SEC.
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-sm mx-auto">
            <Input
              value={cikInput}
              onChange={(e) => setCikInput(e.target.value)}
              placeholder="e.g. 0000320193 (Apple)"
              className="text-sm"
            />
            <Button onClick={handleFetchSEC} disabled={fetchSEC.isPending} size="sm">
              {fetchSEC.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Fetch
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Find CIK numbers at{" "}
            <a href="https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK=&type=&dateb=&owner=include&count=40&search_text=&action=getcompany" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              SEC EDGAR Company Search
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SEC Financials Charts */}
      {financialsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-[250px] w-full" />
        </div>
      ) : (
        financials && financials.length > 0 && <SECFinancials facts={financials} companyName={companyName} />
      )}

      {/* Filings List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">SEC Filings</h3>
            <DataBadge source="real" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setFilingFilter("all")}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${filingFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              {uniqueTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilingFilter(t)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${filingFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {hasCIK && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSEC.mutate({ companyId, cik: cikNumber!, action: "all" }, {
                  onSuccess: () => toast.success("SEC data refreshed"),
                  onError: (err) => toast.error(err.message),
                })}
                disabled={fetchSEC.isPending}
                className="text-xs h-7"
              >
                {fetchSEC.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Refresh
              </Button>
            )}
          </div>
        </div>

        {filingsLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : filteredFilings?.length ? (
          <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
            {filteredFilings.map((f) => (
              <a
                key={f.id}
                href={f.primary_document_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${FILING_TYPE_COLORS[f.filing_type] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {f.filing_type}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.description || f.filing_type}</p>
                    <p className="text-[11px] text-muted-foreground">Filed {f.filing_date}</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No filings found for this filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default SECFilingsTab;
