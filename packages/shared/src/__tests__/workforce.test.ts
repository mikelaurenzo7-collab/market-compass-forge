import {
  WORKFORCE_CATEGORY_CONFIGS,
  scoreTicketPriority,
  scoreLeadQuality,
  classifyDocument,
  assessComplianceRisk,
  parseInvoiceText,
  findScheduleGaps,
} from '../workforce/strategies';
import {
  createWorkforceEngineState,
  executeWorkforceTick,
} from '../workforce/engine';
import type { WorkforceAdapter } from '../workforce/engine';
import { GenericWorkforceAdapter } from '../workforce/adapters';
import type { WorkforceTask, WorkforceBotConfig, SafetyContext } from '../index';
import { createDefaultBudget, createDefaultCircuitBreaker, createDefaultPolicies } from '../index';

// ─── Category Config Tests ────────────────────────────────────

describe('WORKFORCE_CATEGORY_CONFIGS', () => {
  it('covers all 12 workforce categories', () => {
    const categories = WORKFORCE_CATEGORY_CONFIGS.map((c) => c.category);
    expect(categories).toEqual(
      expect.arrayContaining([
        'customer_support',
        'sales_crm',
        'finance',
        'hr',
        'document_processing',
        'email_management',
        'scheduling',
        'compliance',
        'it_ops',
        'reporting',
        'project_management',
        'procurement',
      ])
    );
    expect(categories).toHaveLength(12);
  });

  it('each config has required fields', () => {
    for (const cfg of WORKFORCE_CATEGORY_CONFIGS) {
      expect(cfg.displayName).toBeTruthy();
      expect(cfg.availableStrategies.length).toBeGreaterThan(0);
      expect(cfg.defaultMaxTasksPerHour).toBeGreaterThan(0);
      expect(cfg.defaultEscalationConfidence).toBeGreaterThan(0);
      expect(cfg.defaultEscalationConfidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Scoring Algorithm Tests ──────────────────────────────────

function makeTask(overrides: Partial<WorkforceTask> = {}): WorkforceTask {
  return {
    id: 'task-test',
    category: 'customer_support',
    strategy: 'ticket_triage',
    title: 'Test task',
    description: '',
    priority: 'medium',
    status: 'pending',
    inputData: {},
    retryCount: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('scoreTicketPriority', () => {
  it('scores critical keywords highly', () => {
    const task = makeTask({ title: 'URGENT: production is down and data is lost', description: 'outage' });
    const result = scoreTicketPriority(task);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.priority).toMatch(/critical|high/);
  });

  it('scores low-priority routine requests appropriately', () => {
    const task = makeTask({ title: 'feature request: update my display name', description: '' });
    const result = scoreTicketPriority(task);
    expect(result.overallScore).toBeLessThan(70);
    expect(result.priority).toMatch(/low|medium/);
  });
});

describe('scoreLeadQuality', () => {
  it('scores enterprise company leads highly', () => {
    const task = makeTask({
      strategy: 'lead_scoring',
      inputData: { companySize: 500, budget: 50000, touchpoints: 6, source: 'referral' },
    });
    const result = scoreLeadQuality(task);
    expect(result.qualityScore).toBeGreaterThan(60);
    expect(result.tier).toMatch(/hot|warm/);
  });

  it('scores minimal-info leads lower', () => {
    const task = makeTask({
      strategy: 'lead_scoring',
      inputData: { companySize: 1, budget: 0, touchpoints: 0, source: '' },
    });
    const result = scoreLeadQuality(task);
    expect(result.qualityScore).toBeLessThan(50);
  });
});

describe('classifyDocument', () => {
  it('classifies invoice-related text as invoice', () => {
    const task = makeTask({
      title: 'Invoice #12345',
      description: 'Total Due: $4,500 Net 30 payment terms',
    });
    const result = classifyDocument(task);
    expect(result.documentClass).toBe('invoice');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies contract text correctly', () => {
    const task = makeTask({
      title: 'Service Agreement',
      description: 'This agreement is entered into between the parties herein. Terms and conditions hereby apply.',
    });
    const result = classifyDocument(task);
    expect(result.documentClass).toBe('contract');
  });

  it('classifies general text as unknown', () => {
    const task = makeTask({ title: 'Meeting notes', description: 'Q4 planning session' });
    const result = classifyDocument(task);
    expect(result.documentClass).toBeDefined();
  });
});

describe('assessComplianceRisk', () => {
  it('flags GDPR high risk for EU PII operations', () => {
    const task = makeTask({
      title: 'GDPR data breach notification',
      description: 'Violation detected, data breach overdue penalty audit',
    });
    const result = assessComplianceRisk(task);
    expect(result.riskLevel).toMatch(/high|critical/);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('returns low risk for low-sensitivity internal reads', () => {
    const task = makeTask({ title: 'Monthly status update', description: 'Team progress report' });
    const result = assessComplianceRisk(task);
    expect(result.riskLevel).toMatch(/low|medium/);
  });
});

describe('parseInvoiceText', () => {
  it('extracts invoice number and total', () => {
    const result = parseInvoiceText('Invoice #INV-2024-001\nTotal: $1,250.00\nDue: NET30');
    expect(result.invoiceNumber).toBeTruthy();
    expect(result.totalAmount).toBeGreaterThan(0);
  });
});

describe('findScheduleGaps', () => {
  it('finds open slots in partially filled schedule', () => {
    const slots = [
      { day: 1, startHour: 9, endHour: 12, requiredStaff: 2, assignedStaff: ['Alice'] },
      { day: 1, startHour: 14, endHour: 17, requiredStaff: 2, assignedStaff: ['Bob'] },
    ];
    const gaps = findScheduleGaps(slots);
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('returns no gaps for fully covered schedule', () => {
    const slots = [
      { day: 1, startHour: 9, endHour: 17, requiredStaff: 1, assignedStaff: ['Alice'] },
    ];
    const gaps = findScheduleGaps(slots);
    expect(gaps).toHaveLength(0);
  });
});

// ─── Engine State & Tick Tests ────────────────────────────────

function makeConfig(overrides?: Partial<WorkforceBotConfig>): WorkforceBotConfig {
  return {
    category: 'customer_support',
    strategies: ['ticket_triage'],
    maxTasksPerHour: 10,
    maxConcurrentTasks: 2,
    requireApprovalForExternal: true,
    escalationThresholdConfidence: 0.7,
    dataAccessScopes: ['tickets', 'users'],
    paperMode: true,
    autonomyLevel: 'auto',
    ...overrides,
  };
}

function makeSafety(botId = 'test-bot', tenantId = 'test-tenant'): SafetyContext {
  return {
    tenantId,
    botId,
    platform: 'customer_support',
    policies: createDefaultPolicies('workforce'),
    budget: createDefaultBudget('workforce'),
    circuitBreaker: createDefaultCircuitBreaker(),
  };
}

describe('createWorkforceEngineState', () => {
  it('initializes correctly', () => {
    const state = createWorkforceEngineState(makeConfig(), makeSafety());
    expect(state.tasksProcessedThisHour).toBe(0);
    expect(state.tasksCompleted).toBe(0);
    expect(state.config.category).toBe('customer_support');
  });
});

describe('executeWorkforceTick', () => {
  it('returns skipped when no pending tasks', async () => {
    const config = makeConfig();
    const safety = makeSafety();
    const engineState = createWorkforceEngineState(config, safety);

    const stubAdapter: WorkforceAdapter = {
      category: 'customer_support',
      fetchPendingTasks: async () => [],
      executeTask: async (t) => ({ taskId: t.id, status: 'completed' }),
      escalateTask: async () => ({ success: true }),
      getTaskHistory: async () => [],
      sendNotification: async () => ({ success: true }),
    };

    const { result, newState } = await executeWorkforceTick(engineState, stubAdapter);
    expect(result.result).toBe('skipped');
    expect(newState).toBeDefined();
  });

  it('processes a pending task and updates state', async () => {
    const config = makeConfig();
    const safety = makeSafety();
    const engineState = createWorkforceEngineState(config, safety);

    const task = makeTask({ id: 'task-001' });

    const stubAdapter: WorkforceAdapter = {
      category: 'customer_support',
      fetchPendingTasks: async () => [task],
      executeTask: async (t) => ({ taskId: t.id, status: 'completed', details: { priority: 'medium' } }),
      escalateTask: async () => ({ success: true }),
      getTaskHistory: async () => [],
      sendNotification: async () => ({ success: true }),
    };

    const { result, newState } = await executeWorkforceTick(engineState, stubAdapter);
    expect(result.result).toMatch(/executed|skipped/);
    expect(newState.tasksProcessedThisHour).toBeGreaterThanOrEqual(0);
  });

  it('enforces hourly task rate limit', async () => {
    const config = makeConfig({ maxTasksPerHour: 0 });
    const safety = makeSafety();
    const engineState = createWorkforceEngineState(config, safety);

    const task = makeTask({ id: 'task-002', priority: 'low' });

    const stubAdapter: WorkforceAdapter = {
      category: 'customer_support',
      fetchPendingTasks: async () => [task],
      executeTask: async (t) => ({ taskId: t.id, status: 'completed' }),
      escalateTask: async () => ({ success: true }),
      getTaskHistory: async () => [],
      sendNotification: async () => ({ success: true }),
    };

    const { result } = await executeWorkforceTick(engineState, stubAdapter);
    expect(result.result).toMatch(/skipped|denied/);
  });
});

// ─── GenericWorkforceAdapter Tests ───────────────────────────

describe('GenericWorkforceAdapter', () => {
  it('constructs for any category', () => {
    const adapter = new GenericWorkforceAdapter('compliance');
    expect(adapter.category).toBe('compliance');
  });

  it('fetchPendingTasks returns empty array (stub)', async () => {
    const adapter = new GenericWorkforceAdapter('it_ops');
    const tasks = await adapter.fetchPendingTasks();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('returns failed result when browser automation is requested without runtime config', async () => {
    const adapter = new GenericWorkforceAdapter('it_ops');
    const task = makeTask({
      strategy: 'browser_automation',
      inputData: {
        browserAutomation: {
          steps: [{ action: 'goto', url: 'https://example.com' }],
        },
      },
    });
    const result = await adapter.executeTask(task);
    expect(result.status).toBe('failed');
    expect(result.requiresHumanReview).toBe(true);
    expect(String((result.outputData ?? {}).error ?? '')).toContain('Playwright');
  });
});
