import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, Rss, Activity, Building2, Globe, AlertTriangle, Landmark, Brain } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";

const INTEL_SECTIONS = [
  {
    icon: Building2,
    title: "Companies",
    description: "Screen and analyze private & public companies",
    path: "/intelligence/companies",
    available: false,
  },
  {
    icon: Globe,
    title: "Global Markets",
    description: "Cross-border opportunities and sovereign fund activity",
    path: "/intelligence/markets/global",
    available: false,
  },
  {
    icon: AlertTriangle,
    title: "Distressed Assets",
    description: "Bankruptcy, restructuring, and special situations",
    path: "/intelligence/markets/distressed",
    available: false,
  },
  {
    icon: Landmark,
    title: "Fund Intelligence",
    description: "LP/GP performance, fund benchmarks, and commitments",
    path: "/intelligence/funds",
    available: false,
  },
  {
    icon: Brain,
    title: "AI Research",
    description: "Deep-dive any company with AI-powered analysis",
    path: "/intelligence/research",
    available: false,
  },
  {
    icon: Rss,
    title: "Intelligence Feed",
    description: "Real-time news, signals, and market-moving events",
    path: "/intelligence/feed",
    available: false,
  },
  {
    icon: Activity,
    title: "Sector Pulse",
    description: "Sector momentum, alpha signals, and macro context",
    path: "/intelligence/sector-pulse",
    available: false,
  },
];

const Intelligence = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Market data, research, and signals that power your deal decisions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTEL_SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => section.available && navigate(section.path)}
                disabled={!section.available}
                className="w-full rounded-lg border border-border bg-card p-5 text-left hover:border-primary/30 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <section.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{section.description}</p>
                {!section.available && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground/60">
                    Coming soon
                  </span>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default Intelligence;
