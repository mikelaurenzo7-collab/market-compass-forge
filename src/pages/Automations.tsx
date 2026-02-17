import { useState } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
  ArrowRightCircle,
  Upload,
  MessageSquare,
  Bell,
  ListTodo,
  FileText,
  RefreshCw,
  Settings,
  Sparkles,
  LayoutTemplate,
  BarChart3,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutomations } from "@/hooks/useAutomations";
import {
  AUTOMATION_TEMPLATES,
  TRIGGER_DEFINITIONS,
  ACTION_DEFINITIONS,
  type AutomationRule,
  type AutomationTemplate,
  type TriggerType,
  type ActionType,
} from "@/lib/automationEngine";

// ── Icon resolver ──────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  ArrowRightCircle, Upload, MessageSquare, Bell, CheckCircle2,
  ListTodo, FileText, RefreshCw, Zap, Plus, Play, Settings,
};

const resolveIcon = (name: string) => ICON_MAP[name] ?? Zap;

// ── Template Card ──────────────────────────────────────────────────────
const TemplateCard = ({
  template,
  onActivate,
  isAdded,
}: {
  template: AutomationTemplate;
  onActivate: () => void;
  isAdded: boolean;
}) => {
  const TriggerIcon = resolveIcon(TRIGGER_DEFINITIONS[template.trigger.type]?.icon ?? "Zap");
  const categoryColors: Record<string, string> = {
    deal_workflow: "text-primary bg-primary/10",
    notifications: "text-chart-4 bg-chart-4/10",
    diligence: "text-warning bg-warning/10",
    portfolio: "text-success bg-success/10",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-grape/10 flex items-center justify-center shrink-0">
            <TriggerIcon className="h-4 w-4 text-grape" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{template.name}</p>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${categoryColors[template.category] ?? "text-muted-foreground bg-muted"}`}>
              {template.category.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: template.popularity }).map((_, i) => (
            <Sparkles key={i} className="h-2.5 w-2.5 text-warning" />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{template.description}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <ArrowRightCircle className="h-3 w-3" />
          {TRIGGER_DEFINITIONS[template.trigger.type]?.label}
        </span>
        <span>·</span>
        <span>{template.actions.length} action{template.actions.length > 1 ? "s" : ""}</span>
      </div>
      <button
        onClick={onActivate}
        disabled={isAdded}
        className={`w-full h-8 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
          isAdded
            ? "bg-success/10 text-success cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isAdded ? (
          <><CheckCircle2 className="h-3 w-3" /> Active</>
        ) : (
          <><Plus className="h-3 w-3" /> Activate</>
        )}
      </button>
    </div>
  );
};

// ── Rule Card ──────────────────────────────────────────────────────────
const RuleCard = ({
  rule,
  onToggle,
  onDelete,
  onExpand,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onDelete: () => void;
  onExpand: () => void;
}) => {
  const triggerDef = TRIGGER_DEFINITIONS[rule.trigger.type];
  const TriggerIcon = resolveIcon(triggerDef?.icon ?? "Zap");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-lg border bg-card p-4 transition-all ${
        rule.enabled ? "border-border hover:border-primary/20" : "border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            rule.enabled ? "bg-primary/10" : "bg-muted/50"
          }`}>
            <TriggerIcon className={`h-4 w-4 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <button onClick={onExpand} className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left truncate block">
              {rule.name}
            </button>
            <p className="text-[10px] text-muted-foreground truncate">{rule.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className={`h-7 px-2 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              rule.enabled
                ? "text-success hover:bg-success/10"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {rule.enabled ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {rule.enabled ? "Active" : "Paused"}
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Trigger → Actions flow */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-primary/5 text-primary border border-primary/10">
          <ArrowRightCircle className="h-3 w-3" />
          {triggerDef?.label ?? rule.trigger.type}
          {rule.trigger.conditions.length > 0 && (
            <span className="text-primary/60 ml-0.5">
              ({rule.trigger.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(", ")})
            </span>
          )}
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
        {rule.actions.map((action, i) => {
          const actionDef = ACTION_DEFINITIONS[action.type];
          return (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground border border-border/50">
              {actionDef?.label ?? action.type}
            </span>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          {rule.run_count} run{rule.run_count !== 1 ? "s" : ""}
        </span>
        {rule.last_run && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last: {new Date(rule.last_run).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ── Rule Builder (Quick Create) ────────────────────────────────────────
const QuickRuleBuilder = ({ onSave, onCancel }: { onSave: (rule: any) => void; onCancel: () => void }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("deal_stage_change");
  const [conditionField, setConditionField] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [selectedActions, setSelectedActions] = useState<{ type: ActionType; config: Record<string, any> }[]>([]);

  const triggerDef = TRIGGER_DEFINITIONS[triggerType];

  const addAction = (type: ActionType) => {
    setSelectedActions([...selectedActions, { type, config: {} }]);
  };

  const removeAction = (index: number) => {
    setSelectedActions(selectedActions.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    const updated = [...selectedActions];
    updated[index] = { ...updated[index], config: { ...updated[index].config, [key]: value } };
    setSelectedActions(updated);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Give your automation a name");
      return;
    }
    if (selectedActions.length === 0) {
      toast.error("Add at least one action");
      return;
    }
    const conditions = conditionField && conditionValue
      ? [{ field: conditionField, operator: "equals" as const, value: conditionValue }]
      : [];
    onSave({
      name,
      description: description || `Custom automation: ${TRIGGER_DEFINITIONS[triggerType]?.label}`,
      trigger: { type: triggerType, conditions },
      actions: selectedActions,
      enabled: true,
    });
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> New Automation
        </h3>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      {/* Name + Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Series A Auto-Tasks"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this automation do?"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Trigger */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">When this happens</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TRIGGER_DEFINITIONS) as TriggerType[]).map((type) => {
            const def = TRIGGER_DEFINITIONS[type];
            return (
              <button
                key={type}
                onClick={() => { setTriggerType(type); setConditionField(""); setConditionValue(""); }}
                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  triggerType === type
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditions */}
      {triggerDef?.fields.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Only when</span>
          <select
            value={conditionField}
            onChange={(e) => setConditionField(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Any</option>
            {triggerDef.fields.map((f) => (
              <option key={f} value={f}>{f.replace("_", " ")}</option>
            ))}
          </select>
          {conditionField && (
            <>
              <span className="text-[10px] text-muted-foreground">equals</span>
              <input
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="value..."
                className="h-8 w-36 px-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div>
        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Then do this</label>
        <div className="space-y-2 mb-2">
          {selectedActions.map((action, i) => {
            const actionDef = ACTION_DEFINITIONS[action.type];
            return (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/20 border border-border/50">
                <span className="text-xs font-medium text-foreground shrink-0 mt-1">{i + 1}.</span>
                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-medium text-foreground">{actionDef?.label}</span>
                  {actionDef?.configFields.map((field) => (
                    <input
                      key={field.key}
                      value={action.config[field.key] ?? ""}
                      onChange={(e) => updateActionConfig(i, field.key, e.target.value)}
                      placeholder={field.label}
                      className="w-full h-7 px-2 rounded border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  ))}
                </div>
                <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive mt-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ACTION_DEFINITIONS) as ActionType[]).map((type) => (
            <button
              key={type}
              onClick={() => addAction(type)}
              className="h-7 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/30 transition-colors"
            >
              + {ACTION_DEFINITIONS[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Zap className="h-4 w-4" /> Create Automation
        </button>
      </div>
    </div>
  );
};

// ── Main Automations Page ──────────────────────────────────────────────
const Automations = () => {
  const { rules, isLoading, addRule, addFromTemplate, toggleRule, deleteRule, activeCount, totalRuns } = useAutomations();
  const [view, setView] = useState<"rules" | "templates">("rules");
  const [showBuilder, setShowBuilder] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const addedTemplateIds = new Set(rules.map((r) => r.template_id).filter(Boolean));

  const filteredTemplates = categoryFilter === "all"
    ? AUTOMATION_TEMPLATES
    : AUTOMATION_TEMPLATES.filter((t) => t.category === categoryFilter);

  if (isLoading) {
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Automations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rules that run when things happen. The more you add, the harder it is to leave.
            </p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Automation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Total Rules</span>
            </div>
            <p className="text-xl font-semibold font-mono text-foreground">{rules.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Play className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Active</span>
            </div>
            <p className="text-xl font-semibold font-mono text-success">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <RefreshCw className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Total Runs</span>
            </div>
            <p className="text-xl font-semibold font-mono text-foreground">{totalRuns}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <LayoutTemplate className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Templates</span>
            </div>
            <p className="text-xl font-semibold font-mono text-foreground">{AUTOMATION_TEMPLATES.length}</p>
          </div>
        </div>

        {/* Quick Builder */}
        {showBuilder && (
          <QuickRuleBuilder
            onSave={async (rule) => {
              await addRule(rule);
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-2 border-b border-border pb-0">
          <button
            onClick={() => setView("rules")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "rules"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Rules {rules.length > 0 && <span className="ml-1 text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{rules.length}</span>}
          </button>
          <button
            onClick={() => setView("templates")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === "templates"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Templates <span className="ml-1 text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{AUTOMATION_TEMPLATES.length}</span>
          </button>
        </div>

        {/* Rules View */}
        {view === "rules" && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {rules.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-dashed border-border bg-card p-16 text-center"
                >
                  <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm font-medium text-foreground">No automations yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Start with a template or create a custom rule. Automations fire when deal events happen — stage changes, document uploads, new deals — and execute actions automatically.
                  </p>
                  <button
                    onClick={() => setView("templates")}
                    className="mt-5 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                  >
                    <LayoutTemplate className="h-4 w-4" /> Browse Templates
                  </button>
                </motion.div>
              ) : (
                rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={() => toggleRule(rule.id)}
                    onDelete={() => deleteRule(rule.id)}
                    onExpand={() => {}} // Could open detail view
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Templates View */}
        {view === "templates" && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {["all", "deal_workflow", "notifications", "diligence", "portfolio"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-7 px-3 rounded-md text-xs font-medium transition-colors capitalize ${
                    categoryFilter === cat
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {cat === "all" ? "All" : cat.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isAdded={addedTemplateIds.has(template.id)}
                  onActivate={async () => {
                    await addFromTemplate(template);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Automations;
