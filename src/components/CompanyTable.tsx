import { useNavigate } from "react-router-dom";
import { useCompaniesWithFinancials, formatCurrency } from "@/hooks/useData";
import CompanyAvatar from "@/components/CompanyAvatar";
import CompanyHoverCard from "@/components/CompanyHoverCard";
import { TableSkeleton } from "@/components/SkeletonLoaders";

const CompanyTable = () => {
  const { data: companies, isLoading } = useCompaniesWithFinancials();
  const navigate = useNavigate();

  const top = (companies ?? [])
    .sort((a, b) => (b.latestRound?.valuation_post ?? 0) - (a.latestRound?.valuation_post ?? 0))
    .slice(0, 6);

  if (isLoading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div className="rounded-lg border border-border overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Top Companies by Valuation</h3>
        <button onClick={() => navigate("/companies")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-data">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Valuation</th>
              <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">ARR</th>
              <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/companies/${c.id}`)}
                className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <CompanyHoverCard
                    company={{
                      id: c.id,
                      name: c.name,
                      sector: c.sector,
                      stage: c.stage,
                      hq_country: c.hq_country,
                      employee_count: c.employee_count,
                      valuation: c.latestRound?.valuation_post,
                      arr: c.latestFinancials?.arr,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <CompanyAvatar name={c.name} sector={c.sector} />
                      <span className="text-foreground font-medium hover:text-primary transition-colors">{c.name}</span>
                    </div>
                  </CompanyHoverCard>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.sector ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-foreground font-medium font-mono">{formatCurrency(c.latestRound?.valuation_post ?? null)}</td>
                <td className="px-4 py-2.5 text-right text-foreground font-mono">{formatCurrency(c.latestFinancials?.arr ?? null)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                    {c.stage ?? "—"}
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
