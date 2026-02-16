import { AlertCircle, Check, Zap, ShieldCheck, Building, Brain, User } from "lucide-react";

type DataSourceType = "real" | "synthetic" | "enriched" | "firecrawl" | "perplexity";
type ProvenanceType = "verified" | "provider-estimated" | "model-estimated" | "user-input";

interface DataBadgeProps {
  source: DataSourceType;
  className?: string;
}

export const DataBadge = ({ source, className = "" }: DataBadgeProps) => {
  const badges: Record<DataSourceType, { label: string; color: string; icon: any }> = {
    real: {
      label: "Real-time",
      color: "bg-success/10 text-success border-success/30",
      icon: Check,
    },
    enriched: {
      label: "Enriched",
      color: "bg-primary/10 text-primary border-primary/30",
      icon: Zap,
    },
    firecrawl: {
      label: "Web Scraped",
      color: "bg-primary/10 text-primary border-primary/30",
      icon: Check,
    },
    perplexity: {
      label: "Web Search",
      color: "bg-primary/10 text-primary border-primary/30",
      icon: Check,
    },
    synthetic: {
      label: "Sample Data",
      color: "bg-warning/10 text-warning border-warning/30",
      icon: AlertCircle,
    },
  };

  const badge = badges[source];
  const Icon = badge.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] font-medium ${badge.color} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {badge.label}
    </span>
  );
};

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  className?: string;
}

const provenanceBadges: Record<ProvenanceType, { label: string; color: string; icon: any }> = {
  verified: {
    label: "Verified",
    color: "bg-success/10 text-success border-success/30",
    icon: ShieldCheck,
  },
  "provider-estimated": {
    label: "Provider-Est.",
    color: "bg-primary/10 text-primary border-primary/30",
    icon: Building,
  },
  "model-estimated": {
    label: "Model-Est.",
    color: "bg-warning/10 text-warning border-warning/30",
    icon: Brain,
  },
  "user-input": {
    label: "User-Input",
    color: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30",
    icon: User,
  },
};

export const ProvenanceBadge = ({ type, className = "" }: ProvenanceBadgeProps) => {
  const badge = provenanceBadges[type];
  const Icon = badge.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] font-medium whitespace-nowrap ${badge.color} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {badge.label}
    </span>
  );
};

export const SyntheticDataWarning = () => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
    <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
    <div className="text-xs text-warning">
      <p className="font-medium">Sample data in use</p>
      <p className="text-warning/70 mt-0.5">
        Connect real data sources in Settings to replace with institutional data
      </p>
    </div>
  </div>
);
