import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { Shield, Clock, AlertTriangle, Database, Activity, Building2, TrendingDown, Globe, BarChart3 } from "lucide-react";
import { ProvenanceBadge } from "@/components/DataBadges";

interface ModuleCoverage {
  module: string;
  icon: React.ReactNode;
  totalMetrics: number;
  verified: number;
  providerEstimated: number;
  modelEstimated: number;
  userInput: number;
  refreshCadence: string;
  lastRefresh: string;
  sources: string[];
}

const COVERAGE_DATA: ModuleCoverage[] = [
  {
    module: "Private Companies",
    icon: <Database className="h-4 w-4" />,
    totalMetrics: 12,
    verified: 4,
    providerEstimated: 3,
    modelEstimated: 4,
    userInput: 1,
    refreshCadence: "Weekly",
    lastRefresh: "2 days ago",
    sources: ["SEC EDGAR", "Firecrawl", "User uploads"],
  },
  {
    module: "Real Estate Intel",
    icon: <Building2 className="h-4 w-4" />,
    totalMetrics: 14,
    verified: 3,
    providerEstimated: 5,
    modelEstimated: 5,
    userInput: 1,
    refreshCadence: "Weekly",
    lastRefresh: "3 days ago",
    sources: ["Firecrawl", "Manual entry"],
  },
  {
    module: "Distressed Assets",
    icon: <TrendingDown className="h-4 w-4" />,
    totalMetrics: 16,
    verified: 4,
    providerEstimated: 3,
    modelEstimated: 7,
    userInput: 2,
    refreshCadence: "Daily",
    lastRefresh: "12 hours ago",
    sources: ["PACER (planned)", "Firecrawl", "Manual"],
  },
  {
    module: "Fund Intelligence",
    icon: <Activity className="h-4 w-4" />,
    totalMetrics: 10,
    verified: 2,
    providerEstimated: 4,
    modelEstimated: 3,
    userInput: 1,
    refreshCadence: "Monthly",
    lastRefresh: "1 week ago",
    sources: ["SEC EDGAR", "Firecrawl"],
  },
  {
    module: "Global Markets",
    icon: <Globe className="h-4 w-4" />,
    totalMetrics: 8,
    verified: 1,
    providerEstimated: 2,
    modelEstimated: 4,
    userInput: 1,
    refreshCadence: "Weekly",
    lastRefresh: "4 days ago",
    sources: ["Firecrawl", "Perplexity"],
  },
];

const PROVENANCE_LEGEND = [
  { type: "verified" as const, label: "Verified", description: "Confirmed from authoritative primary source (SEC filing, exchange feed)" },
  { type: "provider-estimated" as const, label: "Provider-Estimated", description: "Calculated by a third-party data provider with stated methodology" },
  { type: "model-estimated" as const, label: "Model-Estimated", description: "Derived by our AI models from available signals — confidence varies" },
  { type: "user-input" as const, label: "User-Input", description: "Manually entered by platform users, not independently verified" },
];

const DataCoverage = () => {
  const totalVerified = COVERAGE_DATA.reduce((s, m) => s + m.verified, 0);
  const totalMetrics = COVERAGE_DATA.reduce((s, m) => s + m.totalMetrics, 0);
  const overallVerifiedPct = Math.round((totalVerified / totalMetrics) * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data Coverage & Provenance"
        subtitle="Transparency into what we know, how we know it, and when it was last checked."
      />

      {/* Platform-wide summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-3xl font-black font-mono text-foreground">{overallVerifiedPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">Metrics from verified sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Database className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-black font-mono text-foreground">{totalMetrics}</p>
            <p className="text-xs text-muted-foreground mt-1">Total tracked metrics across modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="text-3xl font-black font-mono text-foreground">6</p>
            <p className="text-xs text-muted-foreground mt-1">Active data modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Beta disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Beta Platform — Data Coverage Is Evolving</p>
          <p className="text-muted-foreground mt-1">
            Grapevine is in beta. Coverage ratios reflect current integrations and will improve as 
            we onboard institutional data providers. All model-estimated and provider-estimated metrics 
            are clearly labeled throughout the platform.
          </p>
        </div>
      </div>

      {/* Provenance legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provenance Labels</CardTitle>
          <CardDescription>Every metric in Grapevine carries one of these labels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROVENANCE_LEGEND.map((item) => (
              <div key={item.type} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <ProvenanceBadge type={item.type} />
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Module Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {COVERAGE_DATA.map((mod) => {
            const verifiedPct = Math.round((mod.verified / mod.totalMetrics) * 100);
            const providerPct = Math.round((mod.providerEstimated / mod.totalMetrics) * 100);
            const modelPct = Math.round((mod.modelEstimated / mod.totalMetrics) * 100);
            const userPct = Math.round((mod.userInput / mod.totalMetrics) * 100);

            return (
              <Card key={mod.module}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{mod.icon}</span>
                      <CardTitle className="text-sm">{mod.module}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      <Clock className="h-3 w-3 mr-1" />
                      {mod.refreshCadence}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
                    <div className="bg-success" style={{ width: `${verifiedPct}%` }} title={`Verified: ${verifiedPct}%`} />
                    <div className="bg-primary" style={{ width: `${providerPct}%` }} title={`Provider: ${providerPct}%`} />
                    <div className="bg-warning" style={{ width: `${modelPct}%` }} title={`Model: ${modelPct}%`} />
                    <div className="bg-muted-foreground/40" style={{ width: `${userPct}%` }} title={`User: ${userPct}%`} />
                  </div>

                  {/* Legend row */}
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    <div className="text-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-success mr-1" />
                      <span className="text-muted-foreground">Verified</span>
                      <p className="font-mono font-bold text-foreground">{mod.verified}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1" />
                      <span className="text-muted-foreground">Provider</span>
                      <p className="font-mono font-bold text-foreground">{mod.providerEstimated}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-warning mr-1" />
                      <span className="text-muted-foreground">Model</span>
                      <p className="font-mono font-bold text-foreground">{mod.modelEstimated}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 mr-1" />
                      <span className="text-muted-foreground">User</span>
                      <p className="font-mono font-bold text-foreground">{mod.userInput}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>Last refresh: {mod.lastRefresh}</span>
                    <span>{mod.sources.join(" · ")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataCoverage;
