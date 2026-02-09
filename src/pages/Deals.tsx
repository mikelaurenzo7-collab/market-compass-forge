import { TrendingUp } from "lucide-react";

const Deals = () => (
  <div className="p-6 space-y-4">
    <div>
      <h1 className="text-xl font-semibold text-foreground">Deal Flow</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Track and manage your deal pipeline</p>
    </div>
    <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
      <div className="text-center text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Deal pipeline coming soon</p>
      </div>
    </div>
  </div>
);

export default Deals;
