import { ShieldAlert } from "lucide-react";

const DisclaimerFooter = () => (
  <footer className="border-t border-border bg-muted/30 px-4 py-3 text-center">
    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground leading-relaxed max-w-3xl mx-auto">
      <ShieldAlert className="h-3 w-3 shrink-0" />
      <span>
        For informational purposes only — not investment advice. Laurenzo's Grapevine does not provide investment, legal, or tax advice.
        All data and analysis are provided "as-is" without warranty. Past performance does not guarantee future results.
        Always conduct independent due diligence before making investment decisions.
      </span>
    </div>
  </footer>
);

export default DisclaimerFooter;
