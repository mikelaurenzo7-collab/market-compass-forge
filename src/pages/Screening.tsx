import { Search } from "lucide-react";

const Screening = () => (
  <div className="p-6 space-y-4">
    <div>
      <h1 className="text-xl font-semibold text-foreground">Screening</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Screen companies with advanced filters</p>
    </div>
    <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
      <div className="text-center text-muted-foreground">
        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Screening tools coming soon</p>
      </div>
    </div>
  </div>
);

export default Screening;
