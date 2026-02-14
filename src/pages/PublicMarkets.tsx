import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePublicCompanies, useSeedPublicCompanies } from "@/hooks/usePublicCompanies";
import { formatCurrency } from "@/hooks/useData";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Database,
  Building2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import { TableSkeleton } from "@/components/SkeletonLoaders";
import { exportCompaniesCSV } from "@/lib/export";
import { toast } from "sonner";

const SECTORS = [
  "All",
  "Healthcare",
  "Financial Services",
  "Enterprise SaaS",
  "Consumer",
  "Real Estate",
  "Manufacturing",
  "Infrastructure",
  "Defense Tech",
  "Climate Tech",
  "Construction",
  "Restaurant",
  "Services",
];

type SortKey =
  | "name"
  | "ticker"
  | "sector"
  | "market_cap"
  | "price"
  | "pe_ratio"
  | "change";

const PublicMarkets = () => {
  const { data: companies, isLoading } = usePublicCompanies();
  const seedMutation = useSeedPublicCompanies();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const refreshMarketData = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-market-data", { body: { limit: 50 } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Market data refreshed");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to refresh market data");
    },
  });

  const filtered = useMemo(() => {
    if (!companies) return [];
    return companies
      .filter((c) => {
        if (
          search &&
          !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !(c.market_data?.ticker ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "name":
            av = a.name;
            bv = b.name;
            break;
          case "ticker":
            av = a.market_data?.ticker ?? "";
            bv = b.market_data?.ticker ?? "";
            break;
          case "sector":
            av = a.sector ?? "";
            bv = b.sector ?? "";
            break;
          case "market_cap":
            av = a.market_data?.market_cap ?? 0;
            bv = b.market_data?.market_cap ?? 0;
            break;
          case "price":
            av = a.market_data?.price ?? 0;
            bv = b.market_data?.price ?? 0;
            break;
          case "pe_ratio":
            av = a.market_data?.pe_ratio ?? 0;
            bv = b.market_data?.pe_ratio ?? 0;
            break;
          case "change":
            av = a.market_data?.price_change_pct ?? 0;
            bv = b.market_data?.price_change_pct ?? 0;
            break;
        }
        if (typeof av === "string")
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });
  }, [companies, search, sectorFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleSeed = async () => {
    toast.info("Importing public companies from SEC... This may take a moment.");
    try {
      const result = await seedMutation.mutateAsync();
      toast.success(
        `Imported ${result.newly_inserted} companies (${result.total_sec_companies} total in SEC database)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to import companies");
    }
  };

  const SortHeader = ({
    label,
    sortId,
    align,
  }: {
    label: string;
    sortId: SortKey;
    align?: string;
  }) => (
    <th
      className={`px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => toggleSort(sortId)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${
            sortKey === sortId ? "text-primary" : "opacity-30"
          }`}
        />
      </span>
    </th>
  );

  // Stats cards
  const stats = useMemo(() => {
    if (!companies) return null;
    const withMarketData = companies.filter((c) => c.market_data);
    const totalMarketCap = withMarketData.reduce(
      (sum, c) => sum + (c.market_data?.market_cap ?? 0),
      0
    );
    const avgPE =
      withMarketData.filter((c) => c.market_data?.pe_ratio).length > 0
        ? withMarketData.reduce(
            (sum, c) => sum + (c.market_data?.pe_ratio ?? 0),
            0
          ) /
          withMarketData.filter((c) => c.market_data?.pe_ratio).length
        : 0;
    return {
      total: companies.length,
      withTicker: withMarketData.length,
      totalMarketCap,
      avgPE,
    };
  }, [companies]);

  const isEmpty = !companies?.length;

  // Auto-seed on first visit if empty
  useEffect(() => {
    if (isEmpty && !isLoading && !seedMutation.isPending) {
      toast.info("Auto-importing public companies from SEC...");
      seedMutation.mutateAsync().then((result) => {
        toast.success(`Imported ${result.newly_inserted} companies from SEC`);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, isLoading]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Public Markets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading...</p>
        </div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Public Markets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEmpty ? (
              "SEC EDGAR-powered public company intelligence"
            ) : (
              <>
                <span className="font-mono text-primary">
                  {filtered.length}
                </span>{" "}
                public companies tracked via SEC EDGAR
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isEmpty ? "Import from SEC" : "Refresh SEC Data"}
          </button>
          {!isEmpty && (
            <>
              <button
                onClick={() => refreshMarketData.mutate()}
                disabled={refreshMarketData.isPending}
                className="h-9 px-3 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {refreshMarketData.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Prices
              </button>
              <button
                onClick={() =>
                  exportCompaniesCSV(
                    filtered.map((c) => ({
                      ...c,
                      latestRound: null,
                      latestFinancials: null,
                    }))
                  )
                }
                className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Import Public Companies
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Click "Import from SEC" to pull all US publicly traded companies
              from the SEC EDGAR database. This imports ~10,000+ companies with
              their CIK numbers for real-time filings access.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Import All Public Companies
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && !isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Companies
            </div>
            <p className="text-lg font-semibold text-foreground font-mono">
              {stats.total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" /> With Ticker
            </div>
            <p className="text-lg font-semibold text-foreground font-mono">
              {stats.withTicker.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1">
              Total Market Cap
            </div>
            <p className="text-lg font-semibold text-foreground font-mono">
              {formatCurrency(stats.totalMarketCap)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1">Avg P/E</div>
            <p className="text-lg font-semibold text-foreground font-mono">
              {stats.avgPE > 0 ? stats.avgPE.toFixed(1) + "x" : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name or ticker..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(0);
            }}
            className="h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {!isEmpty && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-data">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <SortHeader label="Company" sortId="name" />
                  <SortHeader label="Ticker" sortId="ticker" />
                  <SortHeader label="Sector" sortId="sector" />
                  <SortHeader
                    label="Market Cap"
                    sortId="market_cap"
                    align="right"
                  />
                  <SortHeader label="Price" sortId="price" align="right" />
                  <SortHeader label="Change" sortId="change" align="right" />
                  <SortHeader label="P/E" sortId="pe_ratio" align="right" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/companies/${c.id}`)}
                    className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/companies/${c.id}`);
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <CompanyAvatar name={c.name} sector={c.sector} />
                        <span className="text-foreground font-medium truncate max-w-[200px]">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {c.market_data?.ticker ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {c.sector ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground font-medium font-mono">
                      {formatCurrency(c.market_data?.market_cap ?? null)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground font-mono">
                      {c.market_data?.price
                        ? `$${c.market_data.price.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.market_data?.price_change_pct != null ? (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono text-xs font-medium ${
                            c.market_data.price_change_pct >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {c.market_data.price_change_pct >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(c.market_data.price_change_pct).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground font-mono">
                      {c.market_data?.pe_ratio
                        ? `${c.market_data.pe_ratio.toFixed(1)}x`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No companies match your filters
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-7 px-1.5 rounded bg-secondary border border-border text-sm text-foreground"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2">
              {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMarkets;
