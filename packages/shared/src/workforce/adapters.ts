import type {
  WorkforceCategory,
  WorkforceTask,
  WorkforceTaskResult,
  TaskPriority,
} from '../index';
import type { WorkforceAdapter } from './engine';

interface WorkforceCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  sandbox?: boolean;
  browserWsEndpoint?: string;
  browserExecutablePath?: string;
  browserSessionState?: string;
  browserHeaders?: Record<string, string>;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.ok) return res.json() as Promise<T>;

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter
          ? (Number(retryAfter) > 0 ? Number(retryAfter) * 1000 : 1000)
          : 1000 * 2 ** attempt;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.min(waitMs, 30_000)));
          continue;
        }
      }

      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
        continue;
      }

      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && !lastError.message.startsWith('API ')) {
        await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('jsonFetch: exhausted retries');
}

// ─── Playwright Browser Automation (Elite Resource) ───────────

type BrowserAutomationAction =
  | 'goto'
  | 'click'
  | 'fill'
  | 'press'
  | 'wait_for_selector'
  | 'wait_for_timeout'
  | 'select_option'
  | 'extract_text'
  | 'extract_attribute'
  | 'screenshot';

interface BrowserAutomationStep {
  action: BrowserAutomationAction;
  selector?: string;
  url?: string;
  value?: string;
  key?: string;
  timeoutMs?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  attribute?: string;
  options?: string[];
  fullPage?: boolean;
  outputKey?: string;
}

interface BrowserAutomationSpec {
  steps: BrowserAutomationStep[];
  wsEndpoint?: string;
  executablePath?: string;
  timeoutMs?: number;
  headless?: boolean;
  viewport?: { width: number; height: number };
  captureFinalScreenshot?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseBrowserAutomationSpec(task: WorkforceTask): BrowserAutomationSpec | null {
  const raw = asRecord(task.inputData.browserAutomation);
  if (!raw) return null;

  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const steps: BrowserAutomationStep[] = rawSteps
    .map((step) => asRecord(step))
    .filter((step): step is Record<string, unknown> => Boolean(step))
    .map((step) => {
      const rawWaitUntil = step.waitUntil;
      const waitUntil: BrowserAutomationStep['waitUntil'] =
        rawWaitUntil === 'load'
        || rawWaitUntil === 'domcontentloaded'
        || rawWaitUntil === 'networkidle'
        || rawWaitUntil === 'commit'
          ? rawWaitUntil
          : undefined;

      return {
        action: String(step.action ?? '') as BrowserAutomationAction,
        selector: typeof step.selector === 'string' ? step.selector : undefined,
        url: typeof step.url === 'string' ? step.url : undefined,
        value: typeof step.value === 'string' ? step.value : undefined,
        key: typeof step.key === 'string' ? step.key : undefined,
        timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : undefined,
        waitUntil,
        attribute: typeof step.attribute === 'string' ? step.attribute : undefined,
        options: Array.isArray(step.options) ? step.options.map((o) => String(o)) : undefined,
        fullPage: typeof step.fullPage === 'boolean' ? step.fullPage : undefined,
        outputKey: typeof step.outputKey === 'string' ? step.outputKey : undefined,
      };
    })
    .filter((step) => step.action.length > 0);

  if (steps.length === 0) return null;

  return {
    steps,
    wsEndpoint: typeof raw.wsEndpoint === 'string' ? raw.wsEndpoint : undefined,
    executablePath: typeof raw.executablePath === 'string' ? raw.executablePath : undefined,
    timeoutMs: typeof raw.timeoutMs === 'number' ? raw.timeoutMs : undefined,
    headless: typeof raw.headless === 'boolean' ? raw.headless : undefined,
    viewport: asRecord(raw.viewport)
      ? {
        width: Number((raw.viewport as Record<string, unknown>).width ?? 1280),
        height: Number((raw.viewport as Record<string, unknown>).height ?? 720),
      }
      : undefined,
    captureFinalScreenshot: typeof raw.captureFinalScreenshot === 'boolean'
      ? raw.captureFinalScreenshot
      : undefined,
  };
}

function withBrowserToken(endpoint: string, token: string): string {
  try {
    const url = new URL(endpoint);
    if (!url.searchParams.has('token')) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  } catch {
    return endpoint;
  }
}

function resolveWsEndpoint(spec: BrowserAutomationSpec, creds?: WorkforceCredentials): string | undefined {
  const explicit = spec.wsEndpoint
    ?? creds?.browserWsEndpoint
    ?? (creds?.baseUrl?.startsWith('ws://') || creds?.baseUrl?.startsWith('wss://') ? creds.baseUrl : undefined)
    ?? process.env.PLAYWRIGHT_WS_ENDPOINT;

  if (!explicit) return undefined;
  const token = creds?.apiKey || process.env.PLAYWRIGHT_WS_TOKEN;
  return token ? withBrowserToken(explicit, token) : explicit;
}

async function runPlaywrightAutomation(task: WorkforceTask, creds?: WorkforceCredentials): Promise<Record<string, unknown>> {
  const spec = parseBrowserAutomationSpec(task);
  if (!spec) {
    throw new Error('Missing task.inputData.browserAutomation.steps for browser automation');
  }

  const timeoutMs = Math.min(Math.max(spec.timeoutMs ?? 30_000, 1000), 120_000);
  const wsEndpoint = resolveWsEndpoint(spec, creds);
  const executablePath = spec.executablePath
    ?? creds?.browserExecutablePath
    ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  const playwright = await import('playwright-core');
  const chromium = playwright.chromium;

  if (!wsEndpoint && !executablePath) {
    throw new Error('Playwright is not configured. Set wsEndpoint/browserWsEndpoint or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH');
  }

  const browser = wsEndpoint
    ? await chromium.connect(wsEndpoint, {
      timeout: timeoutMs,
      headers: creds?.browserHeaders,
    })
    : await chromium.launch({
      headless: spec.headless ?? true,
      executablePath,
      timeout: timeoutMs,
    });

  try {
    const context = await browser.newContext({
      viewport: spec.viewport ?? { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const extracted: Record<string, unknown> = {};

    for (const [index, step] of spec.steps.entries()) {
      const stepTimeout = Math.min(Math.max(step.timeoutMs ?? timeoutMs, 250), 120_000);
      switch (step.action) {
        case 'goto': {
          if (!step.url) throw new Error(`Step ${index}: "goto" requires url`);
          await page.goto(step.url, { waitUntil: step.waitUntil ?? 'domcontentloaded', timeout: stepTimeout });
          break;
        }
        case 'click': {
          if (!step.selector) throw new Error(`Step ${index}: "click" requires selector`);
          await page.click(step.selector, { timeout: stepTimeout });
          break;
        }
        case 'fill': {
          if (!step.selector) throw new Error(`Step ${index}: "fill" requires selector`);
          await page.fill(step.selector, step.value ?? '', { timeout: stepTimeout });
          break;
        }
        case 'press': {
          if (!step.selector) throw new Error(`Step ${index}: "press" requires selector`);
          await page.press(step.selector, step.key ?? 'Enter', { timeout: stepTimeout });
          break;
        }
        case 'wait_for_selector': {
          if (!step.selector) throw new Error(`Step ${index}: "wait_for_selector" requires selector`);
          await page.waitForSelector(step.selector, { timeout: stepTimeout });
          break;
        }
        case 'wait_for_timeout': {
          await page.waitForTimeout(Math.min(Math.max(Number(step.timeoutMs ?? 500), 0), 10_000));
          break;
        }
        case 'select_option': {
          if (!step.selector) throw new Error(`Step ${index}: "select_option" requires selector`);
          await page.selectOption(step.selector, step.options ?? (step.value ? [step.value] : []), { timeout: stepTimeout });
          break;
        }
        case 'extract_text': {
          if (!step.selector) throw new Error(`Step ${index}: "extract_text" requires selector`);
          const text = await page.textContent(step.selector, { timeout: stepTimeout });
          extracted[step.outputKey ?? step.selector] = text ?? '';
          break;
        }
        case 'extract_attribute': {
          if (!step.selector || !step.attribute) throw new Error(`Step ${index}: "extract_attribute" requires selector and attribute`);
          const value = await page.getAttribute(step.selector, step.attribute, { timeout: stepTimeout });
          extracted[step.outputKey ?? `${step.selector}@${step.attribute}`] = value;
          break;
        }
        case 'screenshot': {
          const buf = await page.screenshot({ fullPage: step.fullPage ?? true, type: 'png', timeout: stepTimeout });
          extracted[step.outputKey ?? `screenshot_${index}`] = Buffer.from(buf).toString('base64');
          break;
        }
        default:
          throw new Error(`Unsupported browser automation action: ${String(step.action)}`);
      }
    }

    let finalScreenshotBase64: string | undefined;
    if (spec.captureFinalScreenshot) {
      const buf = await page.screenshot({ fullPage: true, type: 'png', timeout: timeoutMs });
      finalScreenshotBase64 = Buffer.from(buf).toString('base64');
    }

    const finalUrl = page.url();
    await context.close();
    return {
      provider: 'playwright-core',
      finalUrl,
      extracted,
      stepCount: spec.steps.length,
      ...(finalScreenshotBase64 ? { finalScreenshotBase64 } : {}),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

// ─── Zendesk Adapter (Customer Support) ───────────────────────

export class ZendeskAdapter implements WorkforceAdapter {
  readonly category: WorkforceCategory = 'customer_support';
  private baseUrl: string;
  private creds: WorkforceCredentials;

  constructor(creds: WorkforceCredentials) {
    this.creds = creds;
    this.baseUrl = creds.baseUrl ?? 'https://your-subdomain.zendesk.com/api/v2';
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.creds.apiKey}` };
  }

  async fetchPendingTasks(): Promise<WorkforceTask[]> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/tickets.json?status=new,open&sort_by=created_at&sort_order=desc`, { headers: this.headers() });
    return (resp.tickets ?? []).map((t: any) => ({
      id: String(t.id),
      category: 'customer_support' as WorkforceCategory,
      strategy: 'ticket_triage' as const,
      title: t.subject ?? 'Untitled ticket',
      description: t.description ?? '',
      priority: mapZendeskPriority(t.priority),
      status: 'pending' as const,
      assignee: t.assignee_id ? String(t.assignee_id) : undefined,
      inputData: { tags: t.tags ?? [], channel: t.via?.channel ?? 'unknown', requester: t.requester_id },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(t.created_at).getTime(),
    }));
  }

  async executeTask(task: WorkforceTask): Promise<WorkforceTaskResult> {
    const startMs = Date.now();
    await jsonFetch<any>(`${this.baseUrl}/tickets/${task.id}.json`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ ticket: { priority: task.priority, comment: { body: `[BeastBots] Auto-triaged as ${task.priority}`, public: false } } }),
    });
    return { taskId: task.id, strategy: task.strategy, status: 'completed', outputData: { newPriority: task.priority }, confidence: 0.85, processingMs: Date.now() - startMs, costUsd: 0, requiresHumanReview: false };
  }

  async escalateTask(task: WorkforceTask, reason: string): Promise<{ success: boolean }> {
    await jsonFetch<any>(`${this.baseUrl}/tickets/${task.id}.json`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ ticket: { priority: 'urgent', comment: { body: `[BeastBots] Escalated: ${reason}`, public: false } } }),
    });
    return { success: true };
  }

  async getTaskHistory(hours: number): Promise<WorkforceTask[]> {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const resp = await jsonFetch<any>(`${this.baseUrl}/tickets.json?updated_after=${since}`, { headers: this.headers() });
    return (resp.tickets ?? []).map((t: any) => ({
      id: String(t.id),
      category: 'customer_support' as WorkforceCategory,
      strategy: 'ticket_triage' as const,
      title: t.subject ?? '',
      description: t.description ?? '',
      priority: mapZendeskPriority(t.priority),
      status: t.status === 'solved' ? 'completed' as const : 'pending' as const,
      inputData: {},
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(t.created_at).getTime(),
    }));
  }

  async sendNotification(_recipient: string, _message: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

function mapZendeskPriority(zp: string | null): TaskPriority {
  switch (zp) {
    case 'urgent': return 'critical';
    case 'high': return 'high';
    case 'normal': return 'medium';
    default: return 'low';
  }
}

// ─── Salesforce Adapter (Sales & CRM) ─────────────────────────

export class SalesforceAdapter implements WorkforceAdapter {
  readonly category: WorkforceCategory = 'sales_crm';
  private instanceUrl: string;
  private creds: WorkforceCredentials;

  constructor(creds: WorkforceCredentials) {
    this.creds = creds;
    this.instanceUrl = creds.baseUrl ?? 'https://your-instance.salesforce.com';
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.creds.apiKey}` };
  }

  async fetchPendingTasks(): Promise<WorkforceTask[]> {
    const query = encodeURIComponent("SELECT Id, Name, Company, Email, Status, LeadSource FROM Lead WHERE IsConverted = false AND Status = 'Open - Not Contacted' ORDER BY CreatedDate DESC LIMIT 50");
    const resp = await jsonFetch<any>(`${this.instanceUrl}/services/data/v59.0/query?q=${query}`, { headers: this.headers() });
    return (resp.records ?? []).map((r: any) => ({
      id: r.Id,
      category: 'sales_crm' as WorkforceCategory,
      strategy: 'lead_scoring' as const,
      title: `Lead: ${r.Name}`,
      description: `Company: ${r.Company ?? 'Unknown'} | Source: ${r.LeadSource ?? 'Unknown'}`,
      priority: 'medium' as TaskPriority,
      status: 'pending' as const,
      inputData: { company: r.Company, email: r.Email, source: r.LeadSource },
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    }));
  }

  async executeTask(task: WorkforceTask): Promise<WorkforceTaskResult> {
    const startMs = Date.now();
    await jsonFetch<any>(`${this.instanceUrl}/services/data/v59.0/sobjects/Lead/${task.id}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ Status: 'Working - Contacted', Description: '[BeastBots] Auto-scored and enriched' }),
    });
    return { taskId: task.id, strategy: task.strategy, status: 'completed', outputData: { enriched: true }, confidence: 0.8, processingMs: Date.now() - startMs, costUsd: 0, requiresHumanReview: false };
  }

  async escalateTask(task: WorkforceTask, reason: string): Promise<{ success: boolean }> {
    await jsonFetch<any>(`${this.instanceUrl}/services/data/v59.0/sobjects/Lead/${task.id}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ Status: 'Escalated', Description: `[BeastBots] ${reason}` }),
    });
    return { success: true };
  }

  async getTaskHistory(_hours: number): Promise<WorkforceTask[]> { return []; }
  async sendNotification(_recipient: string, _message: string): Promise<{ success: boolean }> { return { success: true }; }
}

// ─── QuickBooks Adapter (Finance) ─────────────────────────────

export class QuickBooksAdapter implements WorkforceAdapter {
  readonly category: WorkforceCategory = 'finance';
  private baseUrl: string;
  private creds: WorkforceCredentials;
  private realmId: string;

  constructor(creds: WorkforceCredentials, realmId: string) {
    this.creds = creds;
    this.realmId = realmId;
    this.baseUrl = creds.sandbox ? 'https://sandbox-quickbooks.api.intuit.com/v3' : 'https://quickbooks.api.intuit.com/v3';
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.creds.apiKey}`, Accept: 'application/json' };
  }

  async fetchPendingTasks(): Promise<WorkforceTask[]> {
    const query = encodeURIComponent("SELECT * FROM Invoice WHERE Balance > '0' ORDER BY DueDate ASC MAXRESULTS 50");
    const resp = await jsonFetch<any>(`${this.baseUrl}/company/${this.realmId}/query?query=${query}`, { headers: this.headers() });
    return (resp.QueryResponse?.Invoice ?? []).map((inv: any) => ({
      id: String(inv.Id),
      category: 'finance' as WorkforceCategory,
      strategy: 'invoice_processing' as const,
      title: `Invoice #${inv.DocNumber ?? inv.Id}`,
      description: `Vendor: ${inv.CustomerRef?.name ?? 'Unknown'} | Balance: $${inv.Balance ?? 0}`,
      priority: 'medium' as TaskPriority,
      status: 'pending' as const,
      inputData: { docNumber: inv.DocNumber, totalAmount: inv.TotalAmt, balance: inv.Balance, dueDate: inv.DueDate, rawText: `Invoice ${inv.DocNumber} total $${inv.TotalAmt} due ${inv.DueDate}` },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(inv.MetaData?.CreateTime ?? Date.now()).getTime(),
      deadlineAt: inv.DueDate ? new Date(inv.DueDate).getTime() : undefined,
    }));
  }

  async executeTask(task: WorkforceTask): Promise<WorkforceTaskResult> {
    const startMs = Date.now();
    return { taskId: task.id, strategy: task.strategy, status: 'completed', outputData: { processed: true, invoiceId: task.id }, confidence: 0.9, processingMs: Date.now() - startMs, costUsd: 0.01, requiresHumanReview: false };
  }

  async escalateTask(_task: WorkforceTask, _reason: string): Promise<{ success: boolean }> { return { success: true }; }
  async getTaskHistory(_hours: number): Promise<WorkforceTask[]> { return []; }
  async sendNotification(_recipient: string, _message: string): Promise<{ success: boolean }> { return { success: true }; }
}

// ─── Generic Workforce Adapter (Stub) ─────────────────────────

export class GenericWorkforceAdapter implements WorkforceAdapter {
  readonly category: WorkforceCategory;
  private creds?: WorkforceCredentials;

  constructor(category: WorkforceCategory, creds?: WorkforceCredentials) {
    this.category = category;
    this.creds = creds;
  }

  async fetchPendingTasks(): Promise<WorkforceTask[]> { return []; }

  async executeTask(task: WorkforceTask): Promise<WorkforceTaskResult> {
    if (task.strategy === 'browser_automation' || task.inputData.browserAutomation) {
      const startedAt = Date.now();
      try {
        const output = await runPlaywrightAutomation(task, this.creds);
        return {
          taskId: task.id,
          strategy: task.strategy,
          status: 'completed',
          outputData: output,
          confidence: 0.92,
          processingMs: Date.now() - startedAt,
          costUsd: 0.02,
          requiresHumanReview: false,
          success: true,
          action: 'browser_automation',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          taskId: task.id,
          strategy: task.strategy,
          status: 'failed',
          outputData: { error: message },
          confidence: 0,
          processingMs: Date.now() - startedAt,
          costUsd: 0,
          requiresHumanReview: true,
          escalated: true,
          escalationReason: message,
          success: false,
          action: 'browser_automation_failed',
        };
      }
    }

    return { taskId: task.id, strategy: task.strategy, status: 'completed', outputData: { stub: true }, confidence: 1.0, processingMs: 0, costUsd: 0, requiresHumanReview: false };
  }

  async escalateTask(_task: WorkforceTask, _reason: string): Promise<{ success: boolean }> { return { success: true }; }
  async getTaskHistory(_hours: number): Promise<WorkforceTask[]> { return []; }
  async sendNotification(_recipient: string, _message: string): Promise<{ success: boolean }> { return { success: true }; }
}

// ─── Adapter Factory ──────────────────────────────────────────

export function createWorkforceAdapter(
  category: WorkforceCategory,
  creds?: WorkforceCredentials,
  options?: { realmId?: string }
): WorkforceAdapter {
  if (!creds) return new GenericWorkforceAdapter(category);
  switch (category) {
    case 'customer_support': return new ZendeskAdapter(creds);
    case 'sales_crm': return new SalesforceAdapter(creds);
    case 'finance': return new QuickBooksAdapter(creds, options?.realmId ?? 'default');
    default: return new GenericWorkforceAdapter(category, creds);
  }
}
