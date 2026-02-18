import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Handshake, Sparkles, Briefcase } from "lucide-react";

const actions = [
  {
    icon: Compass,
    label: "Discover",
    description: "Signals & opportunities",
    path: "/discover",
  },
  {
    icon: Handshake,
    label: "Deal Flow",
    description: "Pipeline & Kanban",
    path: "/deals/flow",
  },
  {
    icon: Sparkles,
    label: "Find Deals",
    description: "AI-powered matching",
    path: "/deals/recommended",
  },
  {
    icon: Briefcase,
    label: "Portfolio",
    description: "Track investments",
    path: "/portfolio",
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
    >
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => navigate(a.path)}
          className="group relative rounded-lg border border-border bg-card p-3 sm:p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
        >
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            <a.icon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{a.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.description}</p>
        </button>
      ))}
    </motion.div>
  );
}
