import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFeatureTooltip } from "@/hooks/useFeatureTooltips";
import { Lightbulb, X } from "lucide-react";

interface FeatureTooltipProps {
  featureId: string;
  tip: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

const FeatureTooltip = ({ featureId, tip, children, side = "bottom" }: FeatureTooltipProps) => {
  const { visible, dismiss } = useFeatureTooltip(featureId);

  return (
    <Popover open={visible} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} className="w-64 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-foreground leading-relaxed">{tip}</p>
            <button
              onClick={dismiss}
              className="mt-2 text-[10px] font-medium text-primary hover:underline"
            >
              Got it
            </button>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FeatureTooltip;
