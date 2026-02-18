import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface CompRow {
  id: string;
  company: string;
  revenue: string;
  ebitda: string;
  evRevenue: string;
  evEbitda: string;
}

const emptyRow = (): CompRow => ({
  id: crypto.randomUUID(),
  company: "",
  revenue: "",
  ebitda: "",
  evRevenue: "",
  evEbitda: "",
});

const CompTableBuilder = ({ embedded }: { embedded?: boolean }) => {
  const [rows, setRows] = useState<CompRow[]>([emptyRow(), emptyRow(), emptyRow()]);

  const updateRow = (id: string, field: keyof CompRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const exportCSV = () => {
    const headers = "Company,Revenue ($M),EBITDA ($M),EV/Revenue,EV/EBITDA";
    const csv = [headers, ...rows.map((r) => `${r.company},${r.revenue},${r.ebitda},${r.evRevenue},${r.evEbitda}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comp-table.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comp table exported");
  };

  const medians = {
    evRevenue: rows.filter((r) => r.evRevenue).map((r) => parseFloat(r.evRevenue)).filter((v) => !isNaN(v)),
    evEbitda: rows.filter((r) => r.evEbitda).map((r) => parseFloat(r.evEbitda)).filter((v) => !isNaN(v)),
  };

  const median = (arr: number[]) => {
    if (!arr.length) return "—";
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(1) + "x";
  };

  const Wrapper = embedded ? "div" : Card;

  return (
    <Wrapper className={embedded ? "space-y-4" : ""}>
      {!embedded && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Comp Table Builder</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </CardHeader>
      )}
      <div className={embedded ? "" : ""}>
        {embedded && (
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        )}
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Company</TableHead>
                <TableHead>Revenue ($M)</TableHead>
                <TableHead>EBITDA ($M)</TableHead>
                <TableHead>EV/Revenue</TableHead>
                <TableHead>EV/EBITDA</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input value={row.company} onChange={(e) => updateRow(row.id, "company", e.target.value)} placeholder="Company name" className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Input value={row.revenue} onChange={(e) => updateRow(row.id, "revenue", e.target.value)} placeholder="0" className="h-8 w-24" type="number" />
                  </TableCell>
                  <TableCell>
                    <Input value={row.ebitda} onChange={(e) => updateRow(row.id, "ebitda", e.target.value)} placeholder="0" className="h-8 w-24" type="number" />
                  </TableCell>
                  <TableCell>
                    <Input value={row.evRevenue} onChange={(e) => updateRow(row.id, "evRevenue", e.target.value)} placeholder="0.0x" className="h-8 w-24" />
                  </TableCell>
                  <TableCell>
                    <Input value={row.evEbitda} onChange={(e) => updateRow(row.id, "evEbitda", e.target.value)} placeholder="0.0x" className="h-8 w-24" />
                  </TableCell>
                  <TableCell>
                    <button onClick={() => removeRow(row.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>Median</TableCell>
                <TableCell>—</TableCell>
                <TableCell>—</TableCell>
                <TableCell>{median(medians.evRevenue)}</TableCell>
                <TableCell>{median(medians.evEbitda)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <Button variant="ghost" size="sm" onClick={addRow} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Add Comp
        </Button>
      </div>
    </Wrapper>
  );
};

export default CompTableBuilder;
