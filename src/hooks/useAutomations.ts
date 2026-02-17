import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AutomationRule,
  AutomationTemplate,
  TriggerType,
  evaluateRule,
  interpolateTemplate,
  generateRuleId,
} from "@/lib/automationEngine";
import { toast } from "sonner";

// Store all rules in a single integration_settings row with type 'automations'
const INTEGRATION_TYPE = "automations";

export function useAutomations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch rules ────────────────────────────────────────────────────
  const { data: rulesRow, isLoading } = useQuery({
    queryKey: ["automations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("integration_type", INTEGRATION_TYPE)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const rules: AutomationRule[] = (rulesRow?.config as any)?.rules ?? [];
  const isEnabled = rulesRow?.enabled ?? true;

  // ── Save rules to DB ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (updatedRules: AutomationRule[]) => {
      const { error } = await supabase
        .from("integration_settings")
        .upsert({
          user_id: user!.id,
          integration_type: INTEGRATION_TYPE,
          enabled: true,
          config: { rules: updatedRules },
        }, { onConflict: "user_id,integration_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations", user?.id] });
    },
  });

  // ── Add rule ───────────────────────────────────────────────────────
  const addRule = async (rule: Omit<AutomationRule, "id" | "created_at" | "run_count" | "last_run">) => {
    const newRule: AutomationRule = {
      ...rule,
      id: generateRuleId(),
      created_at: new Date().toISOString(),
      run_count: 0,
      last_run: null,
    };
    await saveMutation.mutateAsync([...rules, newRule]);
    toast.success("Automation created", { description: rule.name });
    return newRule;
  };

  // ── Add from template ──────────────────────────────────────────────
  const addFromTemplate = async (template: AutomationTemplate) => {
    return addRule({
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      actions: template.actions,
      enabled: true,
      template_id: template.id,
    });
  };

  // ── Update rule ────────────────────────────────────────────────────
  const updateRule = async (ruleId: string, updates: Partial<AutomationRule>) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r));
    await saveMutation.mutateAsync(updated);
  };

  // ── Toggle rule ────────────────────────────────────────────────────
  const toggleRule = async (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    await updateRule(ruleId, { enabled: !rule.enabled });
    toast.success(rule.enabled ? "Automation paused" : "Automation activated");
  };

  // ── Delete rule ────────────────────────────────────────────────────
  const deleteRule = async (ruleId: string) => {
    const updated = rules.filter((r) => r.id !== ruleId);
    await saveMutation.mutateAsync(updated);
    toast.success("Automation deleted");
  };

  // ── Execute matching rules ─────────────────────────────────────────
  // Called from DealRoom stage changes, document uploads, etc.
  const executeRules = async (triggerType: TriggerType, eventData: Record<string, any>) => {
    const matchingRules = rules.filter((rule) => evaluateRule(rule, triggerType, eventData));

    for (const rule of matchingRules) {
      for (const action of rule.actions) {
        try {
          await executeAction(action.type, {
            ...action.config,
            // Interpolate templates
            message: action.config.message ? interpolateTemplate(action.config.message, eventData) : undefined,
            title: action.config.title ? interpolateTemplate(action.config.title, eventData) : undefined,
            subject: action.config.subject ? interpolateTemplate(action.config.subject, eventData) : undefined,
          }, eventData);
        } catch (e) {
          console.error(`Automation action failed: ${action.type}`, e);
        }
      }

      // Update run count
      await updateRule(rule.id, {
        run_count: rule.run_count + 1,
        last_run: new Date().toISOString(),
      });
    }

    return matchingRules.length;
  };

  return {
    rules,
    isLoading,
    isEnabled,
    isSaving: saveMutation.isPending,
    addRule,
    addFromTemplate,
    updateRule,
    toggleRule,
    deleteRule,
    executeRules,
    activeCount: rules.filter((r) => r.enabled).length,
    totalRuns: rules.reduce((sum, r) => sum + r.run_count, 0),
  };
}

// ── Action executor ──────────────────────────────────────────────────
async function executeAction(
  actionType: string,
  config: Record<string, any>,
  eventData: Record<string, any>,
) {
  switch (actionType) {
    case "send_slack": {
      // Delegate to existing Slack notify edge function
      await supabase.functions.invoke("slack-notify", {
        body: {
          type: "automation",
          channel: null, // Will use configured channel
          data: { message: config.message, deal_id: eventData.deal_id },
        },
      });
      break;
    }
    case "create_task": {
      if (eventData.deal_id) {
        await supabase.from("pipeline_tasks").insert({
          deal_id: eventData.deal_id,
          title: config.title,
          status: "pending",
          due_date: config.due_days
            ? new Date(Date.now() + Number(config.due_days) * 86400000).toISOString().split("T")[0]
            : null,
        });
      }
      break;
    }
    case "notify_team": {
      // Log as alert notification
      await supabase.from("alert_notifications").insert({
        alert_id: null,
        notification_type: "in_app",
        payload: { message: config.message, source: "automation", deal_id: eventData.deal_id },
      });
      break;
    }
    case "log_decision": {
      if (eventData.deal_id) {
        await supabase.from("decision_log").insert({
          deal_id: eventData.deal_id,
          decision_type: config.decision_type ?? "automation",
          rationale: config.rationale ?? config.message,
          metadata: { automated: true, trigger: eventData },
        });
      }
      break;
    }
    case "sync_crm": {
      await supabase.functions.invoke("crm-sync", {
        body: { action: "push_deals", data: eventData },
      });
      break;
    }
    case "generate_memo":
    case "update_deal_field":
    case "move_stage":
    case "add_to_watchlist":
    case "send_email":
      // These actions are registered but execute as no-ops until
      // the corresponding edge functions are wired up
      console.log(`[Automation] Action ${actionType} queued`, config);
      break;
  }
}
