import { Clock, ArrowRight, DollarSign, Building2 } from "lucide-react";

const activities = [
  { time: "2m ago", type: "funding", text: "Anduril raised $3.0B Series F at $28B valuation", tag: "Defense" },
  { time: "15m ago", type: "exit", text: "Wiz acquisition by Alphabet closes at $32B", tag: "Cybersec" },
  { time: "1h ago", type: "funding", text: "Perplexity AI closed $500M Series C at $9B", tag: "AI" },
  { time: "2h ago", type: "hire", text: "Stripe appoints new CFO ahead of potential IPO", tag: "Fintech" },
  { time: "4h ago", type: "funding", text: "Cursor raised $900M at $9.9B valuation", tag: "Dev Tools" },
  { time: "6h ago", type: "exit", text: "Figma exploring secondary market at $12.5B", tag: "Design" },
];

const ActivityFeed = () => {
  return (
    <div className="rounded-lg border border-border bg-card animate-fade-in">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Activity Feed</h3>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
          <span className="text-[10px] font-mono text-success uppercase">Live</span>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {activities.map((a, i) => (
          <div
            key={i}
            className="px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                  {a.text}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {a.time}
                  </span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                    {a.tag}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
