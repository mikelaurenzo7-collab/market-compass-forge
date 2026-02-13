import { Zap } from "lucide-react";

export const LiveIndicator = () => (
  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
    <div className="relative h-2 w-2">
      <div className="absolute inset-0 rounded-full bg-success animate-pulse" />
      <div className="absolute inset-0 rounded-full bg-success/30" />
    </div>
    <span className="text-xs font-semibold uppercase tracking-wide">LIVE</span>
  </div>
);
