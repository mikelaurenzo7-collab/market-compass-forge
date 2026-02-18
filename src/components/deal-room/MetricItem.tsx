const MetricItem = ({ label, value, highlight }: { label: string; value: string; highlight?: string }) => (
  <div>
    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
    <p className={`text-sm font-mono tabular-nums mt-0.5 ${highlight === "destructive" ? "text-destructive" : "text-foreground"}`}>{value}</p>
  </div>
);

export default MetricItem;
