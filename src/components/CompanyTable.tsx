import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const companies = [
  { name: "Stripe", sector: "Fintech", valuation: "$65.0B", arr: "$2.1B", change: "+18%", trend: "up" as const, stage: "Late", round: "Series I" },
  { name: "Databricks", sector: "Data/AI", valuation: "$62.0B", arr: "$2.4B", change: "+52%", trend: "up" as const, stage: "Late", round: "Series J" },
  { name: "Canva", sector: "SaaS", valuation: "$25.5B", arr: "$2.1B", change: "+35%", trend: "up" as const, stage: "Late", round: "Series F" },
  { name: "Rippling", sector: "HR Tech", valuation: "$13.5B", arr: "$350M", change: "+100%", trend: "up" as const, stage: "Growth", round: "Series F" },
  { name: "Wiz", sector: "Cybersec", valuation: "$12.0B", arr: "$500M", change: "+85%", trend: "up" as const, stage: "Growth", round: "Series E" },
  { name: "Figma", sector: "Design", valuation: "$12.5B", arr: "$600M", change: "-8%", trend: "down" as const, stage: "Late", round: "Series E" },
];

const CompanyTable = () => {
  return (
    <div className="rounded-lg border border-border overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Top Companies by Valuation</h3>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Live</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-data">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Valuation</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">ARR</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Δ YoY</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr
                key={c.name}
                className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <td className="px-4 py-2.5">
                  <span className="text-foreground font-medium">{c.name}</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.sector}</td>
                <td className="px-4 py-2.5 text-right text-foreground font-medium">{c.valuation}</td>
                <td className="px-4 py-2.5 text-right text-foreground">{c.arr}</td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 ${
                      c.trend === "up" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {c.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {c.change}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                    {c.stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyTable;
