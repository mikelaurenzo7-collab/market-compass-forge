import { useCapTable } from "@/hooks/useCompanyData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface CapTableViewProps {
  companyId: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

export default function CapTableView({ companyId }: CapTableViewProps) {
  const { data: entries, isLoading } = useCapTable(companyId);

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!entries?.length) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No cap table data available
        </CardContent>
      </Card>
    );
  }

  // Get latest snapshot date entries
  const latestDate = entries[0]?.snapshot_date;
  const latestEntries = entries.filter((e) => e.snapshot_date === latestDate);

  const pieData = latestEntries
    .filter((e) => e.ownership_pct && e.ownership_pct > 0)
    .map((e) => ({ name: e.shareholder_name, value: e.ownership_pct! }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ownership as of {latestDate}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Ownership"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Shareholder</TableHead>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs text-right">Ownership</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-border/30">
                    <TableCell className="text-sm font-medium">{entry.shareholder_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{entry.share_class}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {entry.ownership_pct ? `${entry.ownership_pct.toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
