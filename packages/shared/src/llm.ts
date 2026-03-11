export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
  redactKeys?: string[];
  maxPromptChars?: number;
  asJson?: boolean;
  /** System prompt for the LLM (sets the assistant role/context) */
  systemPrompt?: string;
}

const DEFAULT_OPTIONS: Required<Omit<LLMOptions, 'asJson' | 'systemPrompt'>> = {
  model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 220),
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
  retries: Number(process.env.LLM_RETRIES ?? 2),
  redactKeys: ['apiKey', 'apiSecret', 'token', 'access_token', 'refresh_token', 'password'],
  maxPromptChars: Number(process.env.LLM_MAX_PROMPT_CHARS ?? 4000),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizePrompt(input: string, maxPromptChars: number): string {
  if (!input) return '';
  return input.length > maxPromptChars ? input.slice(0, maxPromptChars) : input;
}

function redactText(text: string, keys: string[]): string {
  if (!text) return text;
  let redacted = text;
  for (const key of keys) {
    const pattern = new RegExp(`("${key}"\\s*:\\s*")(.*?)(")`, 'gi');
    redacted = redacted.replace(pattern, `$1[REDACTED]$3`);
  }
  return redacted;
}

function estimateUsage(prompt: string, completion: string): LLMUsage {
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(completion.length / 4);
  const totalTokens = promptTokens + completionTokens;
  // Conservative placeholder estimate.
  const estimatedUsd = Number((totalTokens * 0.000005).toFixed(6));
  return { promptTokens, completionTokens, totalTokens, estimatedUsd };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function promptLLM(prompt: string, options: LLMOptions = {}): Promise<string> {
  if (process.env.DISABLE_LLM === 'true') return '[LLM disabled]';

  const cfg = {
    model: options.model ?? DEFAULT_OPTIONS.model,
    maxTokens: options.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
    timeoutMs: options.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs,
    retries: options.retries ?? DEFAULT_OPTIONS.retries,
    redactKeys: options.redactKeys ?? DEFAULT_OPTIONS.redactKeys,
    maxPromptChars: options.maxPromptChars ?? DEFAULT_OPTIONS.maxPromptChars,
    asJson: options.asJson ?? false,
    systemPrompt: options.systemPrompt,
  };

  const safePrompt = redactText(sanitizePrompt(prompt, cfg.maxPromptChars), cfg.redactKeys);
  const apiKey = process.env.OAI_API_KEY;

  if (!apiKey || typeof fetch === 'undefined') {
    return `LLM: ${safePrompt}`;
  }

  let lastError = '';
  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    try {
      const resp = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: cfg.model,
            messages: [
              ...(cfg.systemPrompt ? [{ role: 'system', content: cfg.systemPrompt }] : []),
              { role: 'user', content: safePrompt },
            ],
            max_tokens: cfg.maxTokens,
            temperature: 0.2,
          }),
        },
        cfg.timeoutMs
      );

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`llm_http_${resp.status}:${body.slice(0, 300)}`);
      }

      const data = await resp.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim() ?? '[no response]';

      if (cfg.asJson) {
        try {
          JSON.parse(content);
        } catch {
          return JSON.stringify({ response: content });
        }
      }

      const usage = estimateUsage(safePrompt, content);
      if (process.env.LLM_DEBUG === 'true') {
        console.log('[LLM usage]', usage);
      }

      return content;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < cfg.retries) {
        await sleep(250 * (attempt + 1));
      }
    }
  }

  console.warn('LLM call failed after retries:', lastError);
  return `LLM_FALLBACK: ${safePrompt}`;
}

// ─── Template-based Prompt Execution ──────────────────────────

import type { PromptTemplate } from './prompts.js';

/**
 * Execute a structured prompt template via the LLM.
 * Returns the parsed typed output on success, or null if the LLM is
 * unavailable or the response can't be parsed.
 */
export async function promptWithTemplate<TInput, TOutput>(
  template: PromptTemplate<TInput, TOutput>,
  input: TInput,
  options: Omit<LLMOptions, 'systemPrompt' | 'asJson'> = {},
): Promise<{ result: TOutput | null; raw: string; usage: LLMUsage }> {
  const userPrompt = template.buildUserPrompt(input);
  const raw = await promptLLM(userPrompt, {
    ...options,
    systemPrompt: template.system,
    model: options.model ?? template.model,
    maxTokens: options.maxTokens ?? template.maxTokens,
    asJson: true,
  });

  const usage = estimateUsage(template.system + userPrompt, raw);
  const result = template.parseResponse(raw);
  return { result, raw, usage };
}
