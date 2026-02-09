import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import ActivityFeed from "@/components/ActivityFeed";
import { Bell, User } from "lucide-react";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border glass px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-2xl">
            <SearchBar />
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <button className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6 space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">Market Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Private market intelligence · Updated <span className="font-mono text-primary">2 min ago</span>
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Deal Value" value="$35.2B" change="+12.3%" trend="up" subtitle="Q1 2026" />
            <MetricCard label="Active Deals" value="1,247" change="+8.1%" trend="up" subtitle="Tracked" />
            <MetricCard label="Median Valuation" value="$285M" change="-3.2%" trend="down" subtitle="Series B+" />
            <MetricCard label="Dry Powder" value="$1.2T" change="+0.4%" trend="flat" subtitle="Global PE/VC" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DealFlowChart />
            <SectorHeatmap />
          </div>

          {/* Table + Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <CompanyTable />
            </div>
            <div>
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
