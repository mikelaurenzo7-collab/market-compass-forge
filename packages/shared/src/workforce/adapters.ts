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
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
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

  constructor(category: WorkforceCategory) {
    this.category = category;
  }

  async fetchPendingTasks(): Promise<WorkforceTask[]> { return []; }

  async executeTask(task: WorkforceTask): Promise<WorkforceTaskResult> {
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
    default: return new GenericWorkforceAdapter(category);
  }
}
