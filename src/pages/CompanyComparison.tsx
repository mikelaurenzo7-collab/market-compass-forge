import { useState } from "react";
import { useCompaniesWithFinancials, useCompanyFunding, useCompanyFinancials, formatCurrency, formatPercent } from "@/hooks/useData";
import { Search, X, ArrowLeftRight, Loader2, Building2 } from "lucide-react";

const CompanyComparison = () => {
  const { data: allCompanies, isLoading } = useCompaniesWithFinancials();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCompanies = (allCompanies ?? []).filter((c) => selectedIds.includes(c.id));

  const searchResults = searchQuery.length >= 2
    ? (allCompanies ?? [])
        .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedIds.includes(c.id))
        .slice(0, 8)
    : [];

  const addCompany = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
    setSearchQuery("");
  };

  const removeCompany = (id: string) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const metrics = [
    { label: "Sector", get: (c: any) => c.sector ?? "—" },
    { label: "Stage", get: (c: any) => c.stage ?? "—" },
    { label: "Founded", get: (c: any) => c.founded_year?.toString() ?? "—" },
    { label: "Employees", get: (c: any) => c.employee_count?.toLocaleString() ?? "—" },
    { label: "HQ", get: (c: any) => c.hq_country ?? "—" },
    { label: "Valuation", get: (c: any) => formatCurrency(c.latestRound?.valuation_post ?? null), highlight: true },
    { label: "Last Round", get: (c: any) => c.latestRound?.round_type ?? "—" },
    { label: "Round Size", get: (c: any) => formatCurrency(c.latestRound?.amount ?? null) },
    { label: "ARR", get: (c: any) => formatCurrency(c.latestFinancials?.arr ?? null), highlight: true },
    { label: "Revenue", get: (c: any) => formatCurrency(c.latestFinancials?.revenue ?? null) },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Company Comparison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Compare up to 4 companies side-by-side</p>
      </div>

      {/* Company selector */}
      <div className="flex flex-wrap items-center gap-3">
        {selectedCompanies.map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">{c.name}</span>
            <button onClick={() => removeCompany(c.id)} className="text-primary/60 hover:text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {selectedIds.length < 4 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Add company..."
              className="h-8 pl-8 pr-3 w-48 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-64 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => addCompany(c.id)}
                    className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.sector ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCompanies.length >= 2 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-32">Metric</th>
                {selectedCompanies.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-left text-sm font-semibold text-foreground">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const values = selectedCompanies.map((c) => m.get(c));
                // Find best value for numeric comparison
                const numericValues = values.map((v) => {
                  const num = parseFloat(String(v).replace(/[$,BMK%T]/g, ""));
                  return isNaN(num) ? null : num;
                });
                const maxVal = Math.max(...numericValues.filter((v) => v !== null) as number[]);

                return (
                  <tr key={m.label} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</td>
                    {selectedCompanies.map((c, i) => {
                      const val = m.get(c);
                      const isMax = m.highlight && numericValues[i] !== null && numericValues[i] === maxVal && numericValues.filter((v) => v === maxVal).length === 1;
                      return (
                        <td key={c.id} className={`px-4 py-2.5 text-sm font-mono ${isMax ? "text-primary font-semibold" : "text-foreground"}`}>
                          {val}
                          {isMax && <span className="ml-1 text-[9px] text-primary">★</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 rounded-lg border border-border bg-card">
          <div className="text-center text-muted-foreground">
            <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Select at least 2 companies to compare</p>
            <p className="text-xs mt-1">Search and add companies above</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyComparison;
