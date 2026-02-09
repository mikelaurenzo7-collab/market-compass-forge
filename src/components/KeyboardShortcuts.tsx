import { GLOBAL_HOTKEYS_HELP } from "@/hooks/useHotkeys";
import { Keyboard, X } from "lucide-react";

const KeyboardShortcuts = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-lg border border-border bg-card p-6 w-full max-w-sm shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {GLOBAL_HOTKEYS_HELP.map((hk) => (
            <div key={hk.keys} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{hk.description}</span>
              <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {hk.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
