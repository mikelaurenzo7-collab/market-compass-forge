import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2, Check } from "lucide-react";
import type { IntegrationState } from "@/hooks/useIntegrations";

interface Props {
  state: IntegrationState;
  onUpdate: (config: Record<string, unknown>) => void;
}

const SYNC_DIRECTIONS = [
  { value: "push", label: "Push to calendar" },
  { value: "pull", label: "Pull from calendar" },
  { value: "both", label: "Bidirectional" },
];

export default function CalendarConfigPanel({ state, onUpdate }: Props) {
  const config = state.config as Record<string, unknown>;
  const [syncDirection, setSyncDirection] = useState((config.sync_direction as string) ?? "push");
  const [syncMilestones, setSyncMilestones] = useState((config.sync_deal_milestones as boolean) ?? true);
  const [syncMeetings, setSyncMeetings] = useState((config.sync_meetings as boolean) ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    onUpdate({
      ...config,
      sync_direction: syncDirection,
      sync_deal_milestones: syncMilestones,
      sync_meetings: syncMeetings,
    });
    setTimeout(() => setSaving(false), 500);
    toast.success("Calendar settings saved");
  };

  const handleSyncNow = () => {
    toast.info("Calendar sync initiated", { description: "Deal events will be synced shortly." });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground block mb-2">Sync Direction</label>
        <div className="flex gap-2">
          {SYNC_DIRECTIONS.map((dir) => (
            <button
              key={dir.value}
              onClick={() => setSyncDirection(dir.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                syncDirection === dir.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {dir.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground block">What to sync</label>
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={syncMilestones}
            onChange={(e) => setSyncMilestones(e.target.checked)}
            className="rounded border-border"
          />
          Deal milestones (stage changes, close dates)
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={syncMeetings}
            onChange={(e) => setSyncMeetings(e.target.checked)}
            className="rounded border-border"
          />
          IC meetings and diligence calls
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={handleSyncNow}
          className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Sync Now
        </button>
      </div>

      {state.lastSyncAt && (
        <p className="text-[10px] text-muted-foreground">
          Last sync: {new Date(state.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
