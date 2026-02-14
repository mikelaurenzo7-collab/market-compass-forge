import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Rocket, Code, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CURRENT_VERSION = "2026-02-14";

const CHANGELOG = [
  {
    icon: Rocket,
    title: "REST API Now Live",
    description: "Programmatic access to companies, financials, and intelligence signals via authenticated API keys.",
    link: "/developers",
    linkLabel: "View API Docs",
  },
  {
    icon: Sparkles,
    title: "AI Deal Matcher",
    description: "Find 10 similar companies instantly using AI-powered semantic matching across 7,800+ profiles.",
    link: "/deal-matcher",
    linkLabel: "Try Deal Matcher",
  },
  {
    icon: Mail,
    title: "Email Briefing Preview",
    description: "Preview and send test morning briefings directly from Settings before enabling daily delivery.",
    link: "/settings",
    linkLabel: "Configure Briefing",
  },
  {
    icon: Code,
    title: "Platform Metrics Dashboard",
    description: "Real-time data freshness, coverage stats, and platform health indicators for transparency.",
    link: "/metrics",
    linkLabel: "View Metrics",
  },
];

const WhatsNewModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const lastSeen = localStorage.getItem("grapevine_whats_new_version");
    if (lastSeen !== CURRENT_VERSION) {
      // Small delay so it doesn't compete with page load
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("grapevine_whats_new_version", CURRENT_VERSION);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New in Grapevine
          </DialogTitle>
          <DialogDescription className="text-xs">
            Latest features and improvements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {CHANGELOG.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                  <button
                    onClick={() => { dismiss(); navigate(item.link); }}
                    className="mt-1.5 text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {item.linkLabel} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={dismiss}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mt-2"
        >
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewModal;
