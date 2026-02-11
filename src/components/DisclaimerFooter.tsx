import { ShieldAlert } from "lucide-react";

const DisclaimerFooter = () => (
  <footer className="border-t border-border bg-muted/30 px-4 py-3">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
        <ShieldAlert className="h-3 w-3 shrink-0" />
        <span>
          For informational purposes only — not investment advice. Estimated valuations are based on proprietary models.
          Always conduct independent due diligence before making investment decisions.
        </span>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground shrink-0">
        <span>© {new Date().getFullYear()} Laurenzo's Grapevine</span>
      </div>
    </div>
  </footer>
);

export default DisclaimerFooter;
