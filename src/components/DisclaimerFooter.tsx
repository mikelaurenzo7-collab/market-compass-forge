import { ShieldAlert, Mail, Github, Linkedin } from "lucide-react";

const DisclaimerFooter = () => (
  <footer className="border-t border-border bg-muted/30 px-4 py-3">
    <div className="flex flex-col gap-3 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
          <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            For informational purposes only — not investment advice. All valuations and analyses are informational estimates.
            Always conduct independent due diligence before making investment decisions.
          </span>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} Grapevine. All rights reserved.</span>
        <div className="flex items-center gap-3 text-[10px]">
          <a href="mailto:contact@grapevine.io" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">Contact</span>
          </a>
          <span className="text-border/50">|</span>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Linkedin className="h-3 w-3" />
            <span className="hidden sm:inline">LinkedIn</span>
          </a>
          <span className="text-border/50">|</span>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default DisclaimerFooter;
