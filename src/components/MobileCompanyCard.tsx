import { motion } from "framer-motion";
import { GripVertical, MoreVertical } from "lucide-react";
import CompanyAvatar from "./CompanyAvatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Button } from "./ui/button";
import { useState } from "react";

const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  due_diligence: "Due Diligence",
  ic_review: "IC Review",
  committed: "Committed",
  passed: "Passed",
};

const STAGE_COLORS: Record<string, string> = {
  sourced: "from-muted to-muted/50",
  screening: "from-primary/20 to-primary/10",
  due_diligence: "from-warning/20 to-warning/10",
  ic_review: "from-chart-4/20 to-chart-4/10",
  committed: "from-success/20 to-success/10",
  passed: "from-destructive/20 to-destructive/10",
};

export default function MobileDealCard({ deal, onStageChange, onDelete }: any) {
  const [showActions, setShowActions] = useState(false);

  const handleMoveStage = (stage: string) => {
    onStageChange(deal.id, stage);
    setShowActions(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`bg-gradient-to-br ${STAGE_COLORS[deal.stage] || STAGE_COLORS.sourced} rounded-lg border border-border p-3 space-y-2`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <CompanyAvatar name={deal.companies?.name} sector={deal.companies?.sector} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{deal.companies?.name}</p>
              <p className="text-[10px] text-muted-foreground">{deal.companies?.sector}</p>
            </div>
          </div>
          <button
            onClick={() => setShowActions(true)}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="text-xs font-medium px-2 py-1 rounded-md bg-background/50 w-fit">
          {STAGE_LABELS[deal.stage] || deal.stage}
        </div>

        {deal.notes && <p className="text-xs text-muted-foreground line-clamp-2">{deal.notes}</p>}
      </motion.div>

      <Drawer open={showActions} onOpenChange={setShowActions}>
        <DrawerContent className="px-4">
          <DrawerHeader>
            <DrawerTitle>{deal.companies?.name}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 pb-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">MOVE TO STAGE</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={deal.stage === key ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMoveStage(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                onDelete(deal.id);
                setShowActions(false);
              }}
            >
              Remove from Pipeline
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
