// CSV and print-based export utilities

export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape commas and quotes
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPipelineCSV = (deals: { companies?: { name: string; sector: string | null } | null; stage: string; priority: string | null; notes: string | null }[]) => {
  exportToCSV(
    deals.map((d) => ({
      company: d.companies?.name ?? "Unknown",
      sector: d.companies?.sector ?? "",
      stage: d.stage,
      priority: d.priority ?? "",
      notes: d.notes ?? "",
    })),
    "deal-pipeline"
  );
};

export const exportCompaniesCSV = (companies: { name: string; sector?: string | null; stage?: string | null; hq_country?: string | null; latestRound?: { valuation_post: number | null; round_type: string } | null; latestFinancials?: { arr: number | null } | null }[]) => {
  exportToCSV(
    companies.map((c) => ({
      company: c.name,
      sector: c.sector ?? "",
      stage: c.stage ?? "",
      hq: c.hq_country ?? "",
      valuation: c.latestRound?.valuation_post ?? "",
      arr: c.latestFinancials?.arr ?? "",
      last_round: c.latestRound?.round_type ?? "",
    })),
    "companies"
  );
};

export const printElement = (title: string) => {
  // Add print-specific styles
  const style = document.createElement("style");
  style.id = "print-style";
  style.textContent = `
    @media print {
      body * { visibility: hidden; }
      .print-target, .print-target * { visibility: visible; }
      .print-target { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; }
    }
  `;
  document.head.appendChild(style);
  window.print();
  setTimeout(() => style.remove(), 1000);
};

export const exportMemoText = (memo: { company_name: string; date: string; thesis: string; market: string; traction: string; risks: string; valuation: string; recommendation: string }) => {
  const content = `INVESTMENT MEMO: ${memo.company_name}
Date: ${memo.date}
${"=".repeat(60)}

INVESTMENT THESIS
${memo.thesis}

MARKET ANALYSIS
${memo.market}

TRACTION & METRICS
${memo.traction}

KEY RISKS
${memo.risks}

VALUATION
${memo.valuation}

RECOMMENDATION
${memo.recommendation}`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `memo-${memo.company_name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
