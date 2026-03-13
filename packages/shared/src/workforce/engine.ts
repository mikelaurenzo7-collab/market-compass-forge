import type {
  WorkforceCategory,
  WorkforceTask,
  WorkforceTaskResult,
  WorkforceBotConfig,
  TickResult,
} from '../index';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { promptLLM } from '../llm.js';
import {
  scoreTicketPriority,
  scoreLeadQuality,
  classifyDocument,
  assessComplianceRisk,
  parseInvoiceText,
  findScheduleGaps,
  type ShiftSlot,
} from './strategies.js';
import { processDocument } from '../vertex-ai.js';

// ─── Workforce Adapter Interface ──────────────────────────────

export interface WorkforceAdapter {
  category: WorkforceCategory;
  fetchPendingTasks(): Promise<WorkforceTask[]>;
  executeTask(task: WorkforceTask): Promise<WorkforceTaskResult>;
  escalateTask(task: WorkforceTask, reason: string): Promise<{ success: boolean }>;
  getTaskHistory(hours: number): Promise<WorkforceTask[]>;
  sendNotification(recipient: string, message: string): Promise<{ success: boolean }>;
}

// ─── Workforce Engine State ──────────────────────────────────

export interface WorkforceEngineState {
  config: WorkforceBotConfig;
  safety: SafetyContext;
  lastTickAt: number;
  tasksProcessedThisHour: number;
  tasksEscalated: number;
  tasksCompleted: number;
  tasksFailed: number;
  hourWindowStart: number;
}

export function createWorkforceEngineState(
  config: WorkforceBotConfig,
  safety: SafetyContext
): WorkforceEngineState {
  return {
    config,
    safety,
    lastTickAt: 0,
    tasksProcessedThisHour: 0,
    tasksEscalated: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    hourWindowStart: Date.now(),
  };
}

// ─── Working Hours Check ──────────────────────────────────────

function isWithinWorkingHours(config: WorkforceBotConfig): boolean {
  if (!config.workingHoursUtc) return true;
  const currentHourUtc = new Date().getUTCHours();
  const { start, end } = config.workingHoursUtc;
  if (start <= end) {
    return currentHourUtc >= start && currentHourUtc < end;
  }
  return currentHourUtc >= start || currentHourUtc < end;
}

// ─── Retry helper for task execution ──────────────────────────

const MAX_TASK_RETRIES = 2;

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_TASK_RETRIES
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 100 * 2 ** attempt)); // 100ms, 200ms
      }
    }
  }
  throw lastError;
}

// ─── Workforce Engine Tick ────────────────────────────────────

export async function executeWorkforceTick(
  state: WorkforceEngineState,
  adapter: WorkforceAdapter
): Promise<{ result: TickResult; newState: WorkforceEngineState }> {
  const startTime = Date.now();
  let newState = { ...state };

  // Reset hourly counter if window expired
  if (Date.now() - newState.hourWindowStart > 3_600_000) {
    newState.tasksProcessedThisHour = 0;
    newState.hourWindowStart = Date.now();
  }

  try {
    const actions: string[] = [];

    if (!isWithinWorkingHours(state.config)) {
      return {
        result: {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: 'outside_working_hours',
          result: 'skipped',
          details: { workingHoursUtc: state.config.workingHoursUtc },
          durationMs: Date.now() - startTime,
        },
        newState,
      };
    }

    if (newState.tasksProcessedThisHour >= state.config.maxTasksPerHour) {
      return {
        result: {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: 'rate_limited',
          result: 'skipped',
          details: { tasksThisHour: newState.tasksProcessedThisHour, limit: state.config.maxTasksPerHour },
          durationMs: Date.now() - startTime,
        },
        newState,
      };
    }

    const pendingTasks = await adapter.fetchPendingTasks();
    const tasksToProcess = pendingTasks.slice(0, state.config.maxConcurrentTasks);

    // ─── Ticket Triage ────────────────────────────
    if (state.config.strategies.includes('ticket_triage')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'ticket_triage')) {
        const priorityScore = scoreTicketPriority(task);

        if (state.config.useLLM) {
          const prompt = `Triage support ticket: "${task.title}" — ${task.description}. Rate urgency and suggest routing.`;
          const resp = await promptLLM(prompt);
          logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: 'llm_prompt', result: 'success', riskLevel: 'low', details: { prompt, response: resp } });
        }

        const safetyResult = runSafetyPipeline(state.safety, `ticket_triage ${task.id}`, 0, priorityScore.priority === 'critical' ? 'high' : 'low', {
          bot: { totalTicks: newState.tasksProcessedThisHour },
          config: state.config as unknown as Record<string, unknown>,
          tasksThisHour: newState.tasksProcessedThisHour,
          confidence: priorityScore.overallScore / 100,
        });
        if (!safetyResult.allowed) { actions.push(`Triage blocked for ${task.id}: ${safetyResult.reason}`); continue; }

        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask({ ...task, priority: priorityScore.priority }));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') { newState.tasksCompleted++; actions.push(`🎫 Triaged ${task.id} → ${priorityScore.priority} (score: ${priorityScore.overallScore})`); }
          else if (result.status === 'escalated') { newState.tasksEscalated++; actions.push(`⬆️ Escalated ${task.id}: ${result.escalationReason}`); }
        } else {
          actions.push(`[PAPER] Would triage ${task.id} → ${priorityScore.priority}`);
        }

        logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: `TICKET_TRIAGE ${task.id}`, result: 'success', riskLevel: 'low', details: { priorityScore } });
      }
    }

    // ─── Auto Response ────────────────────────────
    if (state.config.strategies.includes('auto_response')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'auto_response')) {
        const isExternal = Boolean(task.inputData.isExternal);
        const riskLevel = isExternal && state.config.requireApprovalForExternal ? 'high' : 'medium';
        const safetyResult = runSafetyPipeline(state.safety, `auto_response ${task.id}`, 0, riskLevel, {
          bot: { totalTicks: newState.tasksProcessedThisHour },
          config: state.config as unknown as Record<string, unknown>,
          tasksThisHour: newState.tasksProcessedThisHour,
          confidence: Number(task.inputData.confidence ?? 0.5),
          action: { type: isExternal ? 'external_communication' : 'internal_automation' },
          scope: String(task.inputData.scope ?? 'tasks'),
        });
        if (!safetyResult.allowed) { actions.push(`Auto-response blocked for ${task.id}: ${safetyResult.reason}`); continue; }

        if (state.config.useLLM) {
          const prompt = `Draft a professional response to: "${task.title}" — ${task.description}. Keep it concise and helpful.`;
          const resp = await promptLLM(prompt);
          logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: 'llm_prompt', result: 'success', riskLevel: 'low', details: { prompt, response: resp } });
        }

        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`💬 Auto-responded to ${task.id} (confidence: ${((result.confidence ?? 0) * 100).toFixed(0)}%)`);
        } else {
          actions.push(`[PAPER] Would auto-respond to ${task.id}`);
        }
      }
    }

    // ─── Lead Scoring ─────────────────────────────
    if (state.config.strategies.includes('lead_scoring')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'lead_scoring')) {
        const lead = scoreLeadQuality(task);
        actions.push(`📊 Lead ${task.id}: ${lead.tier} (score: ${lead.qualityScore}) → ${lead.recommendedAction}`);
        logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: `LEAD_SCORED ${task.id}`, result: 'success', riskLevel: 'low', details: { lead } });
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          newState.tasksCompleted++;
        }
      }
    }

    // ─── CRM Enrichment ───────────────────────────
    if (state.config.strategies.includes('crm_enrichment')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'crm_enrichment')) {
        const safetyResult = runSafetyPipeline(state.safety, `crm_enrichment ${task.id}`, 0, 'low');
        if (!safetyResult.allowed) continue;
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') { newState.tasksCompleted++; actions.push(`🔍 Enriched CRM record ${task.id}: ${Object.keys(result.outputData ?? {}).length} fields updated`); }
        } else { actions.push(`[PAPER] Would enrich CRM record ${task.id}`); }
      }
    }

    // ─── Invoice Processing ───────────────────────
    if (state.config.strategies.includes('invoice_processing')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'invoice_processing')) {
        const rawText = String(task.inputData.rawText ?? '');
        const rawBase64 = task.inputData.documentBase64 as string | undefined;

        // ── Document AI enrichment ──────────────
        // If a base64 document is provided, use Vertex AI Document AI for structured extraction
        let docAiExtracted: { invoiceNumber: string; vendorName: string; totalAmount: number; confidence: number } | null = null;
        if (rawBase64) {
          try {
            const mimeType = (task.inputData.mimeType as string) ?? 'application/pdf';
            const docResult = await processDocument(rawBase64, mimeType, 'invoice');
            if (docResult) {
              const invoiceNum = docResult.entities.find(e => e.type === 'invoice_id' || e.type === 'invoice_number');
              const vendor = docResult.entities.find(e => e.type === 'supplier_name' || e.type === 'vendor_name');
              const total = docResult.entities.find(e => e.type === 'total_amount' || e.type === 'net_amount');
              docAiExtracted = {
                invoiceNumber: invoiceNum?.value ?? '',
                vendorName: vendor?.value ?? '',
                totalAmount: total ? parseFloat(total.value.replace(/[^0-9.]/g, '')) || 0 : 0,
                confidence: docResult.entities.reduce((s, e) => s + e.confidence, 0) / Math.max(docResult.entities.length, 1),
              };
              logAuditEntry({
                tenantId: state.safety.tenantId,
                botId: state.safety.botId,
                platform: state.config.category,
                action: `DOCAI_INVOICE ${task.id}`,
                result: 'success',
                riskLevel: 'low',
                details: { entitiesFound: docResult.entities.length, confidence: docAiExtracted.confidence },
              });
            }
          } catch {
            // Document AI is enrichment — fall back to regex parser
          }
        }

        // Use Document AI result if available and confident, otherwise fall back to regex
        const extracted = docAiExtracted && docAiExtracted.confidence >= 0.7
          ? docAiExtracted
          : parseInvoiceText(rawText);
        const costEstimate = extracted.totalAmount > 0 ? 0.01 : 0;
        const safetyResult = runSafetyPipeline(state.safety, `invoice_processing ${task.id}`, costEstimate, 'medium');
        if (!safetyResult.allowed) { actions.push(`Invoice blocked for ${task.id}: ${safetyResult.reason}`); continue; }

        if (extracted.confidence < state.config.escalationThresholdConfidence) {
          await executeWithRetry(() => adapter.escalateTask(task, `Low extraction confidence: ${(extracted.confidence * 100).toFixed(0)}%`));
          newState.tasksEscalated++;
          actions.push(`⬆️ Escalated invoice ${task.id} — confidence ${(extracted.confidence * 100).toFixed(0)}%`);
        } else if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          newState.tasksCompleted++;
          actions.push(`📄 Processed invoice ${extracted.invoiceNumber} from ${extracted.vendorName}: $${extracted.totalAmount.toFixed(2)}`);
          newState.safety = { ...newState.safety, budget: recordSpend(newState.safety.budget, costEstimate) };
        } else { actions.push(`[PAPER] Would process invoice ${extracted.invoiceNumber}: $${extracted.totalAmount.toFixed(2)}`); }

        logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: `INVOICE_PROCESSED ${task.id}`, result: 'success', riskLevel: 'medium', details: { extracted } });
      }
    }

    // ─── Expense Reconciliation ───────────────────
    if (state.config.strategies.includes('expense_reconciliation')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'expense_reconciliation')) {
        const safetyResult = runSafetyPipeline(state.safety, `expense_reconciliation ${task.id}`, 0, 'medium');
        if (!safetyResult.allowed) continue;
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`🧾u Reconciled expense ${task.id}: ${JSON.stringify((result.outputData ?? {}).category ?? 'uncategorized')}`);
        } else { actions.push(`[PAPER] Would reconcile expense ${task.id}`); }
      }
    }

    // ─── Employee Onboarding ──────────────────────
    if (state.config.strategies.includes('employee_onboarding')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'employee_onboarding')) {
        const safetyResult = runSafetyPipeline(state.safety, `employee_onboarding ${task.id}`, 0, 'medium');
        if (!safetyResult.allowed) continue;
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          const stepCount = (result.nextTasks ?? []).length;
          actions.push(`👤 Onboarding ${task.id}: step complete, ${stepCount} next steps queued`);
        } else { actions.push(`[PAPER] Would execute onboarding step for ${task.id}`); }
      }
    }

    // ─── Shift Scheduling ─────────────────────────
    if (state.config.strategies.includes('shift_scheduling')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'shift_scheduling')) {
        const slots = task.inputData.slots as ShiftSlot[] | undefined;
        if (slots) {
          const gaps = findScheduleGaps(slots);
          if (gaps.length > 0) { actions.push(`📅 Schedule gaps found: ${gaps.length} slots need ${gaps.reduce((s, g) => s + g.shortfall, 0)} more staff`); }
          else { actions.push('📅 Schedule fully covered — no gaps'); }
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          newState.tasksCompleted++;
        }
      }
    }

    // ─── Document Classification ──────────────────
    if (state.config.strategies.includes('document_classification')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'document_classification')) {
        const classification = classifyDocument(task);
        actions.push(`📁 Classified ${task.id} → ${classification.documentClass} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`);
        if (classification.confidence < state.config.escalationThresholdConfidence) {
          await executeWithRetry(() => adapter.escalateTask(task, `Low classification confidence: ${(classification.confidence * 100).toFixed(0)}%`));
          newState.tasksEscalated++;
        } else if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          newState.tasksCompleted++;
        }
        logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: `DOC_CLASSIFIED ${task.id}`, result: 'success', riskLevel: 'low', details: { classification } });
      }
    }

    // ─── Data Extraction ──────────────────────────
    if (state.config.strategies.includes('data_extraction')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'data_extraction')) {
        if (state.config.useLLM) {
          const prompt = `Extract structured data from this document: "${task.title}" — ${task.description}`;
          const resp = await promptLLM(prompt);
          logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: 'llm_prompt', result: 'success', riskLevel: 'low', details: { prompt, response: resp } });
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📋 Extracted data from ${task.id}: ${Object.keys(result.outputData ?? {}).length} fields`);
        } else { actions.push(`[PAPER] Would extract data from ${task.id}`); }
      }
    }

    // ─── Email Triage ─────────────────────────────
    if (state.config.strategies.includes('email_triage')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'email_triage')) {
        const priorityScore = scoreTicketPriority(task);
        if (state.config.useLLM) {
          const prompt = `Categorize this email and suggest action: "${task.title}" — ${task.description}`;
          await promptLLM(prompt);
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          await executeWithRetry(() => adapter.executeTask({ ...task, priority: priorityScore.priority }));
          newState.tasksProcessedThisHour++;
          newState.tasksCompleted++;
        }
        actions.push(`📧 Triaged email ${task.id} → ${priorityScore.priority}`);
      }
    }

    // ─── Meeting Scheduler ────────────────────────
    if (state.config.strategies.includes('meeting_scheduler')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'meeting_scheduler')) {
        const safetyResult = runSafetyPipeline(state.safety, `meeting_scheduler ${task.id}`, 0, 'low');
        if (!safetyResult.allowed) continue;
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📆 Scheduled meeting for ${task.id}: ${(result.outputData ?? {}).scheduledAt ?? 'TBD'}`);
        } else { actions.push(`[PAPER] Would schedule meeting for ${task.id}`); }
      }
    }

    // ─── Compliance Monitoring ────────────────────
    if (state.config.strategies.includes('compliance_monitoring')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'compliance_monitoring')) {
        const assessment = assessComplianceRisk(task);
        logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: `COMPLIANCE_CHECK ${task.id}`, result: 'success', riskLevel: assessment.riskLevel, details: { assessment } });
        if (assessment.requiresImmediateAction) {
          await executeWithRetry(() => adapter.escalateTask(task, `Compliance risk: ${assessment.riskLevel} (score: ${assessment.riskScore})`));
          newState.tasksEscalated++;
          actions.push(`🚨 Compliance alert ${task.id}: ${assessment.riskLevel} — ${assessment.findings.join('; ')}`);
        } else {
          actions.push(`✅ Compliance check ${task.id}: ${assessment.riskLevel} (score: ${assessment.riskScore})`);
          if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
            await executeWithRetry(() => adapter.executeTask(task));
            newState.tasksProcessedThisHour++;
            newState.tasksCompleted++;
          }
        }
      }
    }

    // ─── Audit Preparation ────────────────────────
    if (state.config.strategies.includes('audit_preparation')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'audit_preparation')) {
        const safetyResult = runSafetyPipeline(state.safety, `audit_preparation ${task.id}`, 0, 'high');
        if (!safetyResult.allowed) { actions.push(`Audit prep blocked for ${task.id}: ${safetyResult.reason}`); continue; }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📋 Audit package compiled for ${task.id}: ${Object.keys(result.outputData ?? {}).length} artifacts`);
        } else { actions.push(`[PAPER] Would compile audit package for ${task.id}`); }
      }
    }

    // ─── System Health Check ──────────────────────
    if (state.config.strategies.includes('system_health_check')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'system_health_check')) {
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          const healthy = (result.outputData ?? {}).healthy ?? true;
          if (!healthy) {
            await adapter.sendNotification(String(task.assignee ?? 'ops-team'), `System alert: ${task.title} — ${JSON.stringify((result.outputData ?? {}).issues ?? [])}`);
            actions.push(`🔴 System issue detected: ${task.title}`);
          } else { newState.tasksCompleted++; actions.push(`🟢 System healthy: ${task.title}`); }
        } else { actions.push(`[PAPER] Would check system health: ${task.title}`); }
      }
    }

    // ─── Report Generation ────────────────────────
    if (state.config.strategies.includes('report_generation')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'report_generation')) {
        if (state.config.useLLM) {
          const prompt = `Generate a business report summary for: "${task.title}" with data: ${JSON.stringify(task.inputData).slice(0, 500)}`;
          const resp = await promptLLM(prompt);
          logAuditEntry({ tenantId: state.safety.tenantId, botId: state.safety.botId, platform: state.config.category, action: 'llm_prompt', result: 'success', riskLevel: 'low', details: { prompt, response: resp } });
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📈 Report generated: ${task.title}`);
        } else { actions.push(`[PAPER] Would generate report: ${task.title}`); }
      }
    }

    // ─── Task Orchestration ───────────────────────
    if (state.config.strategies.includes('task_orchestration')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'task_orchestration')) {
        const safetyResult = runSafetyPipeline(state.safety, `task_orchestration ${task.id}`, 0, 'low');
        if (!safetyResult.allowed) continue;
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          const nextCount = (result.nextTasks ?? []).length;
          actions.push(`⚙️ Orchestrated ${task.id}: spawned ${nextCount} downstream tasks`);
        } else { actions.push(`[PAPER] Would orchestrate workflow for ${task.id}`); }
      }
    }

    // ─── Vendor Evaluation ────────────────────────
    if (state.config.strategies.includes('vendor_evaluation')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'vendor_evaluation')) {
        if (state.config.useLLM) {
          const prompt = `Evaluate vendor proposal: "${task.title}" — compare pricing, SLA, and capabilities from: ${JSON.stringify(task.inputData).slice(0, 500)}`;
          await promptLLM(prompt);
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`🏢 Vendor evaluated ${task.id}: ${(result.outputData ?? {}).recommendation ?? 'review needed'}`);
        } else { actions.push(`[PAPER] Would evaluate vendor for ${task.id}`); }
      }
    }

    // ─── Contract Review ──────────────────────────
    if (state.config.strategies.includes('contract_review')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'contract_review')) {
        const safetyResult = runSafetyPipeline(state.safety, `contract_review ${task.id}`, 0, 'high');
        if (!safetyResult.allowed) { actions.push(`Contract review blocked for ${task.id}: ${safetyResult.reason}`); continue; }

        // ── Document AI contract extraction ─────
        const contractBase64 = task.inputData.documentBase64 as string | undefined;
        if (contractBase64) {
          try {
            const mimeType = (task.inputData.mimeType as string) ?? 'application/pdf';
            const docResult = await processDocument(contractBase64, mimeType, 'contract');
            if (docResult) {
              const keyEntities = docResult.entities.filter(e => e.confidence >= 0.6);
              actions.push(`📑 Document AI: ${keyEntities.length} contract clauses extracted from ${task.id}`);
              logAuditEntry({
                tenantId: state.safety.tenantId,
                botId: state.safety.botId,
                platform: state.config.category,
                action: `DOCAI_CONTRACT ${task.id}`,
                result: 'success',
                riskLevel: 'low',
                details: { entitiesFound: docResult.entities.length, topEntities: keyEntities.slice(0, 10).map(e => ({ type: e.type, text: e.value.slice(0, 60) })) },
              });
            }
          } catch {
            // Document AI is enrichment — proceed with LLM/manual
          }
        }

        if (state.config.useLLM) {
          const prompt = `Review contract for key terms, renewal dates, and risk clauses: "${task.title}"`;
          await promptLLM(prompt);
        }
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📝 Contract reviewed ${task.id}: ${(result.outputData ?? {}).keyFindings ?? 'see details'}`);
        } else { actions.push(`[PAPER] Would review contract for ${task.id}`); }
      }
    }

    // ─── Knowledge Base Sync ──────────────────────
    if (state.config.strategies.includes('knowledge_base_sync')) {
      for (const task of tasksToProcess.filter((t) => t.strategy === 'knowledge_base_sync')) {
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          const result = await executeWithRetry(() => adapter.executeTask(task));
          newState.tasksProcessedThisHour++;
          if (result.status === 'completed') newState.tasksCompleted++;
          actions.push(`📚 KB synced: ${(result.outputData ?? {}).articlesUpdated ?? 0} articles updated`);
        } else { actions.push(`[PAPER] Would sync knowledge base for ${task.id}`); }
      }
    }

    newState.lastTickAt = Date.now();
    newState.safety = { ...newState.safety, circuitBreaker: recordSuccess(newState.safety.circuitBreaker) };

    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: actions.length > 0 ? actions.join(' | ') : 'scan',
        result: actions.length > 0 ? 'executed' : 'skipped',
        details: {
          tasksPending: pendingTasks.length,
          tasksProcessed: newState.tasksProcessedThisHour - state.tasksProcessedThisHour,
          tasksEscalated: newState.tasksEscalated - state.tasksEscalated,
          tasksCompleted: newState.tasksCompleted - state.tasksCompleted,
        },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  } catch (error) {
    newState.safety = { ...newState.safety, circuitBreaker: recordError(newState.safety.circuitBreaker) };
    logAuditEntry({
      tenantId: state.safety.tenantId,
      botId: state.safety.botId,
      platform: state.config.category,
      action: 'workforce_tick_error',
      result: 'failure',
      riskLevel: 'high',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'tick',
        result: 'error',
        details: { error: error instanceof Error ? error.message : String(error) },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }
}
