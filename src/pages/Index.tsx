import { useDashboardMetrics, useActivityEvents, formatCurrency } from "@/hooks/useData";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import ActivityFeed from "@/components/ActivityFeed";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Market Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Private market intelligence · Updated <span className="font-mono text-primary">live</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Deal Value" value={formatCurrency(metrics?.totalDealValue ?? 0)} subtitle={`${metrics?.totalRounds ?? 0} rounds`} />
        <MetricCard label="Companies Tracked" value={(metrics?.totalCompanies ?? 0).toLocaleString()} subtitle="Active" />
        <MetricCard label="Median Valuation" value={formatCurrency(metrics?.medianValuation ?? 0)} subtitle="All rounds" />
        <MetricCard label="Sectors" value="15" subtitle="Tracked" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DealFlowChart />
        <SectorHeatmap />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <CompanyTable />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Index;
