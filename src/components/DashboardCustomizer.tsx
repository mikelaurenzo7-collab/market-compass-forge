import { useState, useCallback } from "react";
import { WidgetConfig, DEFAULT_WIDGETS } from "@/hooks/useDashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, RotateCcw, Settings2 } from "lucide-react";

interface Props {
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
  onReset: () => void;
}

export default function DashboardCustomizer({ widgets, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<WidgetConfig[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setLocal([...widgets]);
    setOpen(isOpen);
  };

  const toggleVisible = useCallback((id: string) => {
    setLocal((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setLocal((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next.map((w, i) => ({ ...w, order: i }));
    });
    setDragIdx(idx);
  };

  const handleSave = () => {
    onSave(local);
    setOpen(false);
  };

  const handleReset = () => {
    setLocal([...DEFAULT_WIDGETS]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Customize dashboard"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto py-2">
          {local.map((w, idx) => (
            <div
              key={w.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-grab active:cursor-grabbing transition-colors ${
                dragIdx === idx ? "bg-primary/10" : "hover:bg-secondary/30"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">{w.label}</span>
              <Switch
                checked={w.visible}
                onCheckedChange={() => toggleVisible(w.id)}
                aria-label={`Toggle ${w.label}`}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Layout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
