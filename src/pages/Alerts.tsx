import { Bell } from "lucide-react";

const Alerts = () => (
  <div className="p-6 space-y-4">
    <div>
      <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Monitor companies, sectors, and investor activity</p>
    </div>
    <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
      <div className="text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Alert center coming soon</p>
      </div>
    </div>
  </div>
);

export default Alerts;
