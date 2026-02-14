import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeftRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/hooks/useData";
import Sparkline from "./Sparkline";

type CompanyRow = {
  id: string;
  name: string;
  sector: string | null;
  stage: string | null;
  employee_count: number | null;
};

type FinancialRow = {
  period: string;
  revenue: number | null;
  ebitda: number | null;
  arr: number | null;
  gross_margin: number | null;
};

/**
 * Split-screen company comparison panel.
 * Activated via ⌘+Shift+C or the Command Palette.
 */
export default function CompareMode({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<"left" | "right" | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["compare-companies", search],
    queryFn: async () => {
      let q = supabase.from("companies").select("id, name, sector, stage, employee_count").order("name").limit(20);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return (data ?? []) as CompanyRow[];
    },
    enabled: open,
  });

  const useCompanyFinancials = (companyId: string | null) =>
    useQuery({
      queryKey: ["compare-fin", companyId],
      queryFn: async () => {
        if (!companyId) return null;
        const [compRes, finRes, roundRes] = await Promise.all([
          supabase.from("companies").select("*").eq("id", companyId).single(),
          supabase.from("financials").select("*").eq("company_id", companyId).order("period", { ascending: true }),
          supabase.from("funding_rounds").select("*").eq("company_id", companyId).order("date", { ascending: false }).limit(1),
        ]);
        return {
          company: compRes.data,
          financials: (finRes.data ?? []) as FinancialRow[],
          latestRound: roundRes.data?.[0] ?? null,
        };
      },
      enabled: !!companyId && open,
    });

  const leftData = useCompanyFinancials(leftId);
  const rightData = useCompanyFinancials(rightId);

  useEffect(() => {
    if (!open) {
      setLeftId(null);
      setRightId(null);
      setSelecting(null);
    }
  }, [open]);

  const renderSlot = (
    side: "left" | "right",
    id: string | null,
    query: ReturnType<typeof useCompanyFinancials>
  ) => {
    if (!id) {
      return (
        <button
          onClick={() => setSelecting(side)}
          className="w-full h-full min-h-[300px] border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
        >
          <Search className="h-6 w-6" />
          <span className="text-sm">Select a company</span>
        </button>
      );
    }

    const d = query.data;
    if (!d) return <div className="animate-pulse h-[300px] rounded-lg bg-muted/30" />;

    const revenueData = d.financials.map((f) => f.revenue ?? 0).filter(Boolean);
    const metrics = [
      { label: "Sector", value: d.company?.sector ?? "—" },
      { label: "Stage", value: d.company?.stage ?? "—" },
      { label: "Employees", value: d.company?.employee_count?.toLocaleString() ?? "—" },
      { label: "Valuation", value: formatCurrency(d.latestRound?.valuation_post ?? null) },
      { label: "Latest ARR", value: formatCurrency(d.financials[d.financials.length - 1]?.arr ?? null) },
      { label: "Gross Margin", value: d.financials[d.financials.length - 1]?.gross_margin ? `${d.financials[d.financials.length - 1].gross_margin}%` : "—" },
      { label: "EBITDA", value: formatCurrency(d.financials[d.financials.length - 1]?.ebitda ?? null) },
    ];

    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{d.company?.name}</h3>
          <button onClick={() => (side === "left" ? setLeftId(null) : setRightId(null))} className="p-1 hover:bg-secondary rounded">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {revenueData.length > 2 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Revenue Trend</p>
            <Sparkline data={revenueData} width={200} height={40} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className="text-sm font-mono font-medium text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Compare Companies</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search overlay */}
          <AnimatePresence>
            {selecting && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-10 w-80 rounded-lg border border-border bg-card shadow-xl overflow-hidden"
              >
                <div className="p-3 border-b border-border">
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search companies…"
                    className="w-full text-sm bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {(companies ?? []).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (selecting === "left") setLeftId(c.id);
                        else setRightId(c.id);
                        setSelecting(null);
                        setSearch("");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.sector}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Split view */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto">
            {renderSlot("left", leftId, leftData)}
            {renderSlot("right", rightId, rightData)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
