import { useFundingRoundsWithTerms, type FundingRoundWithTerms } from "@/hooks/useCompanyData";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/hooks/useData";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Scale } from "lucide-react";
import { useState, useMemo } from "react";

interface RoundTermsProps {
  companyId: string;
}

function WaterfallPreview({ rounds }: { rounds: FundingRoundWithTerms[] }) {
  const [exitValue, setExitValue] = useState(1000000000); // $1B default

  const roundsWithTerms = rounds.filter((r) => r.instrument_type && r.valuation_post);

  const waterfall = useMemo(() => {
    if (!roundsWithTerms.length) return [];

    let remaining = exitValue;
    const results: { name: string; amount: number; pct: number }[] = [];

    // Process in reverse (latest rounds get paid first in liquidation)
    const reversed = [...roundsWithTerms].reverse();
    for (const round of reversed) {
      const liqPref = round.liquidation_preference ?? 1;
      const invested = round.amount ?? 0;
      const prefAmount = invested * liqPref;

      if (remaining <= 0) {
        results.push({ name: round.round_type, amount: 0, pct: 0 });
        continue;
      }

      const payout = Math.min(prefAmount, remaining);
      remaining -= payout;
      results.push({
        name: round.round_type,
        amount: payout,
        pct: exitValue > 0 ? (payout / exitValue) * 100 : 0,
      });
    }

    // Remaining goes to common
    results.push({
      name: "Common / Founders",
      amount: Math.max(remaining, 0),
      pct: exitValue > 0 ? (Math.max(remaining, 0) / exitValue) * 100 : 0,
    });

    return results.reverse();
  }, [exitValue, roundsWithTerms]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Liquidation Waterfall Preview</h4>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Exit Value</span>
            <span className="text-sm font-mono font-bold">{formatCurrency(exitValue)}</span>
          </div>
          <Slider
            value={[exitValue]}
            onValueChange={([v]) => setExitValue(v)}
            min={0}
            max={10000000000}
            step={100000000}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>$0</span>
            <span>$10B</span>
          </div>
        </div>

        {/* Waterfall bars */}
        <div className="space-y-1.5">
          {waterfall.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-28 truncate">{item.name}</span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-sm transition-all"
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono w-20 text-right">{formatCurrency(item.amount)}</span>
              <span className="text-[10px] text-muted-foreground w-12 text-right">{item.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoundTerms({ companyId }: RoundTermsProps) {
  const { data: rounds, isLoading } = useFundingRoundsWithTerms(companyId);

  if (isLoading) return <Skeleton className="h-64" />;

  if (!rounds?.length) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No funding round data available
        </CardContent>
      </Card>
    );
  }

  const roundsWithTerms = rounds.filter((r) => r.instrument_type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Round Terms</h3>
      </div>

      {/* Terms Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Round</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Instrument</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Post-Money</TableHead>
                <TableHead className="text-xs text-center">Liq Pref</TableHead>
                <TableHead className="text-xs">Anti-Dilution</TableHead>
                <TableHead className="text-xs text-center">Pro Rata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.map((r) => (
                <TableRow key={r.id} className="border-border/30">
                  <TableCell className="font-medium text-sm">{r.round_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell>
                    {r.instrument_type ? (
                      <Badge variant="outline" className="text-[10px]">{r.instrument_type}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">{formatCurrency(r.amount)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{formatCurrency(r.valuation_post)}</TableCell>
                  <TableCell className="text-center text-sm">
                    {r.liquidation_preference ? `${r.liquidation_preference}x` : "—"}
                    {r.participation_cap ? ` / ${r.participation_cap}x cap` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.anti_dilution_type || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.pro_rata_rights === true ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Yes</Badge>
                    ) : r.pro_rata_rights === false ? (
                      <Badge variant="outline" className="text-[10px]">No</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Waterfall Preview */}
      {roundsWithTerms.length > 0 && <WaterfallPreview rounds={rounds} />}
    </div>
  );
}
