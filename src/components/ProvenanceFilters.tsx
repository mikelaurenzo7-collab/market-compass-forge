import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ProvenanceFilterState {
  sourceType: string;
  verificationStatus: string;
  freshness: string;
}

interface ProvenanceFiltersProps {
  filters: ProvenanceFilterState;
  onChange: (filters: ProvenanceFilterState) => void;
  className?: string;
}

const SOURCE_TYPES = [
  { value: "all", label: "All Sources" },
  { value: "api", label: "API Feed" },
  { value: "sec_edgar", label: "SEC EDGAR" },
  { value: "firecrawl", label: "Web Scrape" },
  { value: "perplexity", label: "Web Search" },
  { value: "manual", label: "Manual Entry" },
  { value: "ai_generated", label: "AI Generated" },
  { value: "seeded", label: "Sample Data" },
];

const VERIFICATION_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "disputed", label: "Disputed" },
];

const FRESHNESS_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function getDefaultProvenanceFilters(): ProvenanceFilterState {
  return { sourceType: "all", verificationStatus: "all", freshness: "all" };
}

export function applyProvenanceFilter(record: Record<string, any>, filters: ProvenanceFilterState): boolean {
  if (filters.sourceType !== "all" && record.source_type !== filters.sourceType) return false;
  if (filters.verificationStatus !== "all" && record.verification_status !== filters.verificationStatus) return false;
  if (filters.freshness !== "all") {
    const fetchedAt = record.fetched_at ?? record.scraped_at ?? record.updated_at ?? record.created_at;
    if (!fetchedAt) return false;
    const ms = Date.now() - new Date(fetchedAt).getTime();
    const days = ms / (24 * 60 * 60 * 1000);
    const thresholds: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    if (days > (thresholds[filters.freshness] ?? Infinity)) return false;
  }
  return true;
}

export function hasActiveProvenanceFilters(filters: ProvenanceFilterState): boolean {
  return filters.sourceType !== "all" || filters.verificationStatus !== "all" || filters.freshness !== "all";
}

const ProvenanceFilters = ({ filters, onChange, className = "" }: ProvenanceFiltersProps) => {
  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      <Select value={filters.sourceType} onValueChange={(v) => onChange({ ...filters, sourceType: v })}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_TYPES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.verificationStatus} onValueChange={(v) => onChange({ ...filters, verificationStatus: v })}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Verification" />
        </SelectTrigger>
        <SelectContent>
          {VERIFICATION_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.freshness} onValueChange={(v) => onChange({ ...filters, freshness: v })}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Freshness" />
        </SelectTrigger>
        <SelectContent>
          {FRESHNESS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveProvenanceFilters(filters) && (
        <button
          onClick={() => onChange(getDefaultProvenanceFilters())}
          className="h-8 px-2.5 rounded-md text-[11px] font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
};

export default ProvenanceFilters;
