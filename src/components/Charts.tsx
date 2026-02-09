import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const dealData = [
  { month: "Jul", deals: 142, value: 18.2 },
  { month: "Aug", deals: 128, value: 15.7 },
  { month: "Sep", deals: 167, value: 22.4 },
  { month: "Oct", deals: 153, value: 19.8 },
  { month: "Nov", deals: 189, value: 28.3 },
  { month: "Dec", deals: 134, value: 16.1 },
  { month: "Jan", deals: 198, value: 31.5 },
  { month: "Feb", deals: 212, value: 35.2 },
];

const sectorData = [
  { name: "AI/ML", value: 42 },
  { name: "Fintech", value: 28 },
  { name: "Cybersec", value: 22 },
  { name: "Health", value: 18 },
  { name: "Climate", value: 15 },
  { name: "SaaS", value: 31 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md border border-border px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span className="text-primary">{p.value}{p.name === "value" ? "B" : ""}</span>
        </p>
      ))}
    </div>
  );
};

export const DealFlowChart = () => (
  <div className="rounded-lg border border-border bg-card p-4 animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground">Deal Flow & Volume</h3>
      <div className="flex gap-3 text-[10px] font-mono text-muted-foreground uppercase">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> Capital ($B)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/40" /> Deals
        </span>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={dealData}>
        <defs>
          <linearGradient id="dealGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(192, 91%, 52%)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(192, 91%, 52%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="value" stroke="hsl(192, 91%, 52%)" fill="url(#dealGradient)" strokeWidth={2} name="value" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const SectorHeatmap = () => (
  <div className="rounded-lg border border-border bg-card p-4 animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground">Sector Activity</h3>
      <span className="text-[10px] font-mono text-muted-foreground uppercase">Q1 2026</span>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={sectorData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" fill="hsl(192, 91%, 52%)" radius={[0, 4, 4, 0]} name="deals" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
