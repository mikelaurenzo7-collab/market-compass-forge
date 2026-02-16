import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClaimStackEntry, calcRecoveryRange, LEGAL_STAGES } from "@/lib/underwriting";

interface DistressedAnalyticsProps {
  claimStack: ClaimStackEntry[];
  legalStage: string;
  legalTimeline: { stage: string; date: string; description?: string }[];
  recoveryLow: number | null;
  recoveryHigh: number | null;
  processMilestones: { label: string; target_date?: string; completed_date?: string; status: string }[];
  estimatedValue: number | null;
}

const stageColors: Record<string, string> = {
  pre_filing: "bg-muted text-muted-foreground",
  chapter_11: "bg-warning/10 text-warning",
  chapter_7: "bg-destructive/10 text-destructive",
  receivership: "bg-warning/10 text-warning",
  plan_confirmed: "bg-primary/10 text-primary",
  emerged: "bg-success/10 text-success",
  liquidated: "bg-destructive/10 text-destructive",
};

const DistressedAnalytics = ({
  claimStack,
  legalStage,
  legalTimeline,
  recoveryLow,
  recoveryHigh,
  processMilestones,
  estimatedValue,
}: DistressedAnalyticsProps) => {
  const recovery = claimStack.length > 0 && estimatedValue
    ? calcRecoveryRange(claimStack, estimatedValue)
    : null;

  const currentStageObj = LEGAL_STAGES.find(s => s.key === legalStage);
  const currentStageOrder = currentStageObj?.order ?? 0;

  return (
    <div className="space-y-4">
      {/* Legal Stage Timeline */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legal Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${stageColors[legalStage] ?? ""} border-none`}>
              {currentStageObj?.label ?? legalStage}
            </Badge>
          </div>
          {legalTimeline.length > 0 && (
            <div className="relative pl-4 border-l-2 border-border space-y-3">
              {legalTimeline.map((t, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <p className="text-xs font-mono text-muted-foreground">{t.date}</p>
                  <p className="text-sm text-foreground font-medium">{t.stage}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
              ))}
            </div>
          )}
          {legalTimeline.length === 0 && (
            <p className="text-xs text-muted-foreground">No court filings recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Claim Stack */}
      {claimStack.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Claim Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {claimStack
              .sort((a, b) => a.priority - b.priority)
              .map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-mono">{c.priority}</span>
                    <span className="text-foreground font-medium">{c.class}</span>
                    {c.secured && <Badge variant="outline" className="text-[9px] h-4">Secured</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">${(c.amount / 1e6).toFixed(1)}M</span>
                    <span className="text-xs font-mono text-primary">{c.recovery_est_pct}%</span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Recovery Range */}
      {(recovery || (recoveryLow != null && recoveryHigh != null)) && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recovery Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-destructive font-mono">{recovery?.low ?? recoveryLow}%</span>
              <Progress value={((recovery?.low ?? recoveryLow ?? 0) + (recovery?.high ?? recoveryHigh ?? 0)) / 2} className="flex-1" />
              <span className="text-xs text-success font-mono">{recovery?.high ?? recoveryHigh}%</span>
            </div>
            {recovery && recovery.waterfall.length > 0 && (
              <div className="space-y-1 mt-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Waterfall</p>
                {recovery.waterfall.map((w, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{w.class}</span>
                    <span className="font-mono text-foreground">${(w.recovery / 1e6).toFixed(1)}M ({w.pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Process Milestones */}
      {processMilestones.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Process Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {processMilestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${m.status === "completed" ? "bg-success" : m.status === "in_progress" ? "bg-warning" : "bg-muted-foreground/30"}`} />
                  <span className="text-foreground">{m.label}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {m.completed_date ?? m.target_date ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DistressedAnalytics;
