import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Folder, Loader2, Check } from "lucide-react";
import type { IntegrationState } from "@/hooks/useIntegrations";

interface Props {
  state: IntegrationState;
  onUpdate: (config: Record<string, unknown>) => void;
}

const SYNC_FREQUENCIES = [
  { value: "realtime", label: "Real-time" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
];

export default function CloudStorageConfigPanel({ state, onUpdate }: Props) {
  const config = state.config as Record<string, unknown>;
  const [folderName, setFolderName] = useState((config.sync_folder_name as string) ?? "");
  const [autoImport, setAutoImport] = useState((config.auto_import as boolean) ?? true);
  const [syncFrequency, setSyncFrequency] = useState((config.sync_frequency as string) ?? "hourly");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    onUpdate({
      ...config,
      sync_folder_name: folderName,
      auto_import: autoImport,
      sync_frequency: syncFrequency,
    });
    setTimeout(() => setSaving(false), 500);
    toast.success("Cloud storage settings saved");
  };

  const handleSyncNow = () => {
    toast.info("Sync initiated", { description: "Files will appear in your Data Room shortly." });
  };

  const providerName =
    state.type === "google_drive" ? "Google Drive" :
    state.type === "onedrive" ? "OneDrive" : "Dropbox";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Sync Folder</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={`${providerName} folder path`}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Files from this folder will sync to your Deal Room Data Room
        </p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Sync Frequency</label>
        <div className="flex gap-2">
          {SYNC_FREQUENCIES.map((freq) => (
            <button
              key={freq.value}
              onClick={() => setSyncFrequency(freq.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                syncFrequency === freq.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {freq.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={autoImport}
          onChange={(e) => setAutoImport(e.target.checked)}
          className="rounded border-border"
        />
        Auto-import new files to Data Room
      </label>

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
          {state.itemsSynced ?? 0} files synced · Last sync: {new Date(state.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
