import { useState } from "react";
import { Building2, DollarSign, Percent, Users, Edit3, Save } from "lucide-react";

interface AssetKPIsProps {
  noi?: number;
  capRate?: number;
  ltv?: number;
  occupancy?: number;
  marketValue?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  onSave?: (data: AssetMetrics) => void;
}

export interface AssetMetrics {
  noi: number;
  capRate: number;
  ltv: number;
  occupancy: number;
  marketValue: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
}

const defaults: AssetMetrics = {
  noi: 0,
  capRate: 0,
  ltv: 0,
  occupancy: 0,
  marketValue: 0,
  sqft: 0,
  yearBuilt: 2000,
  propertyType: "Office",
};

export default function AssetKPIs(props: AssetKPIsProps) {
  const [editing, setEditing] = useState(false);
  const [metrics, setMetrics] = useState<AssetMetrics>({
    noi: props.noi ?? defaults.noi,
    capRate: props.capRate ?? defaults.capRate,
    ltv: props.ltv ?? defaults.ltv,
    occupancy: props.occupancy ?? defaults.occupancy,
    marketValue: props.marketValue ?? defaults.marketValue,
    sqft: props.sqft ?? defaults.sqft,
    yearBuilt: props.yearBuilt ?? defaults.yearBuilt,
    propertyType: props.propertyType ?? defaults.propertyType,
  });

  const handleSave = () => {
    setEditing(false);
    props.onSave?.(metrics);
  };

  const fmt = (v: number) =>
    v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;

  // Computed cap rate from NOI / market value
  const computedCapRate = metrics.marketValue > 0 ? (metrics.noi / metrics.marketValue) * 100 : metrics.capRate;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Asset KPIs
        </h3>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          {editing ? <><Save className="h-3 w-3" /> Save</> : <><Edit3 className="h-3 w-3" /> Edit</>}
        </button>
      </div>

      {/* Cap Rate Formula */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Cap Rate Formula</p>
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="text-sm font-semibold text-foreground">Cap Rate</span>
          <span className="text-sm text-muted-foreground">=</span>
          <div className="text-center">
            <div className="text-sm font-semibold text-primary border-b border-primary/30 px-2 pb-0.5">NOI</div>
            <div className="text-xs text-muted-foreground pt-0.5">Current Market Value</div>
          </div>
          <span className="text-sm text-muted-foreground">=</span>
          <span className="text-sm font-bold font-mono text-primary">{computedCapRate.toFixed(2)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {editing ? (
          <>
            <InputMetric label="NOI ($)" value={metrics.noi} onChange={(v) => setMetrics({ ...metrics, noi: v })} prefix="$" />
            <InputMetric label="Market Value ($)" value={metrics.marketValue} onChange={(v) => setMetrics({ ...metrics, marketValue: v })} prefix="$" />
            <InputMetric label="LTV (%)" value={metrics.ltv} onChange={(v) => setMetrics({ ...metrics, ltv: v })} suffix="%" />
            <InputMetric label="Occupancy (%)" value={metrics.occupancy} onChange={(v) => setMetrics({ ...metrics, occupancy: v })} suffix="%" />
            <InputMetric label="Sq Ft" value={metrics.sqft} onChange={(v) => setMetrics({ ...metrics, sqft: v })} />
            <InputMetric label="Year Built" value={metrics.yearBuilt} onChange={(v) => setMetrics({ ...metrics, yearBuilt: v })} />
            <div className="p-2 rounded-md bg-secondary/30 border border-border/50">
              <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Property Type</label>
              <select
                value={metrics.propertyType}
                onChange={(e) => setMetrics({ ...metrics, propertyType: e.target.value })}
                className="w-full h-7 px-2 text-xs bg-background border border-border rounded-md text-foreground"
              >
                {["Office", "Industrial", "Retail", "Multifamily", "Mixed-Use", "Hospitality", "Land"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <KPICard icon={DollarSign} label="NOI" value={fmt(metrics.noi)} color="text-success" />
            <KPICard icon={Percent} label="Cap Rate" value={`${computedCapRate.toFixed(2)}%`} color="text-primary" />
            <KPICard icon={Building2} label="LTV" value={`${metrics.ltv.toFixed(1)}%`} color={metrics.ltv > 75 ? "text-destructive" : "text-warning"} />
            <KPICard icon={Users} label="Occupancy" value={`${metrics.occupancy.toFixed(1)}%`} color={metrics.occupancy > 90 ? "text-success" : "text-warning"} />
            <KPICard icon={Building2} label="Market Value" value={fmt(metrics.marketValue)} color="text-foreground" />
            <KPICard icon={Building2} label="Size" value={`${metrics.sqft.toLocaleString()} SF`} color="text-foreground" />
            <KPICard icon={Building2} label="Year Built" value={String(metrics.yearBuilt)} color="text-foreground" />
            <KPICard icon={Building2} label="Type" value={metrics.propertyType} color="text-foreground" />
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 rounded-md bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function InputMetric({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="p-2 rounded-md bg-secondary/30 border border-border/50">
      <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-7 px-2 text-xs font-mono bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
