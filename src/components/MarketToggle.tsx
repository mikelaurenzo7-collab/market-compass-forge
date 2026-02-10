export type MarketFilter = "all" | "private" | "public";

interface MarketToggleProps {
  value: MarketFilter;
  onChange: (value: MarketFilter) => void;
}

const MarketToggle = ({ value, onChange }: MarketToggleProps) => (
  <div className="flex gap-1 bg-muted rounded-lg p-1">
    {(["all", "private", "public"] as const).map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === m
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {m === "all" ? "All Markets" : m === "private" ? "Private" : "Public"}
      </button>
    ))}
  </div>
);

export default MarketToggle;
