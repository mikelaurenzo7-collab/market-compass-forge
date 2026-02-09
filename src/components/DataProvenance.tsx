import ConfidenceBadge from "@/components/ConfidenceBadge";

interface DataProvenanceProps {
  label: string;
  value: string;
  confidence: string | null;
  source?: string | null;
  scrapedAt?: string | null;
}

const DataProvenance = ({ label, value, confidence, source, scrapedAt }: DataProvenanceProps) => {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <ConfidenceBadge level={confidence} source={source} scrapedAt={scrapedAt} compact />
      </div>
      <p className="text-lg font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
};

export default DataProvenance;
