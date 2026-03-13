// ─── Multi-Provider LLM Router ────────────────────────────────
//
// Routes prompts to OpenAI, Anthropic, or Grok (xAI) with automatic
// cross-provider failover.  Each provider has its own request format,
// auth, and response parsing.

import type { PromptTemplate } from './prompts.js';

// ─── Types ─────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'grok' | 'vertex';

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  provider: LLMProvider;
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
  /** Preferred provider (falls back to others if unavailable) */
  provider?: LLMProvider;
}

// ─── Provider Configuration ───────────────────────────────────

interface ProviderConfig {
  name: LLMProvider;
  endpoint: string;
  envKey: string;
  defaultModel: string;
  /** Cost per 1K tokens [prompt, completion] in USD */
  costPer1k: [number, number];
  buildRequest: (
    model: string,
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    apiKey: string,
  ) => { headers: Record<string, string>; body: string };
  parseResponse: (data: unknown) => string;
  resolveEndpoint?: (model: string, apiKey: string) => string;
}

const OPENAI_CONFIG: ProviderConfig = {
  name: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  envKey: 'OAI_API_KEY',
  defaultModel: 'gpt-4o-mini',
  costPer1k: [0.00015, 0.0006],
  buildRequest: (model, messages, maxTokens, apiKey) => ({
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
  }),
  parseResponse: (data) => {
    const d = data as { choices?: Array<{ message?: { content?: string } }> };
    return d.choices?.[0]?.message?.content?.trim() ?? '[no response]';
  },
};

const ANTHROPIC_CONFIG: ProviderConfig = {
  name: 'anthropic',
  endpoint: 'https://api.anthropic.com/v1/messages',
  envKey: 'ANTHROPIC_API_KEY',
  defaultModel: 'claude-sonnet-4-20250514',
  costPer1k: [0.003, 0.015],
  buildRequest: (model, messages, maxTokens, apiKey) => {
    // Anthropic uses a separate `system` param, not a system message
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');
    return {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: userMessages,
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    };
  },
  parseResponse: (data) => {
    const d = data as { content?: Array<{ type: string; text?: string }> };
    const textBlock = d.content?.find((b) => b.type === 'text');
    return textBlock?.text?.trim() ?? '[no response]';
  },
};

const GROK_CONFIG: ProviderConfig = {
  name: 'grok',
  endpoint: 'https://api.x.ai/v1/chat/completions',
  envKey: 'GROK_API_KEY',
  defaultModel: 'grok-3-mini',
  costPer1k: [0.0003, 0.0005],
  buildRequest: (model, messages, maxTokens, apiKey) => ({
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
  }),
  parseResponse: (data) => {
    const d = data as { choices?: Array<{ message?: { content?: string } }> };
    return d.choices?.[0]?.message?.content?.trim() ?? '[no response]';
  },
};

const VERTEX_CONFIG: ProviderConfig = {
  name: 'vertex',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  envKey: 'VERTEX_API_KEY',
  defaultModel: 'gemini-2.5-flash',
  costPer1k: [0.000075, 0.0003],
  resolveEndpoint: (model, apiKey) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
  buildRequest: (_model, messages, maxTokens, _apiKey) => {
    const system = messages.find((m) => m.role === 'system')?.content;
    const userContent = messages
      .filter((m) => m.role !== 'system')
      .map((m) => m.content)
      .join('\n\n');
    return {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(system
          ? {
            systemInstruction: {
              role: 'system',
              parts: [{ text: system }],
            },
          }
          : {}),
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.2,
        },
      }),
    };
  },
  parseResponse: (data) => {
    const d = data as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const parts = d.candidates?.[0]?.content?.parts ?? [];
    const joined = parts.map((p) => p.text ?? '').join('').trim();
    return joined || '[no response]';
  },
};

export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  openai: OPENAI_CONFIG,
  anthropic: ANTHROPIC_CONFIG,
  grok: GROK_CONFIG,
  vertex: VERTEX_CONFIG,
};

/** Default failover order: vertex (preferred) → openai → anthropic → grok */
const FAILOVER_CHAIN: LLMProvider[] = ['vertex', 'openai', 'anthropic', 'grok'];

// ─── Defaults ─────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<Omit<LLMOptions, 'asJson' | 'systemPrompt' | 'provider'>> = {
  model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 220),
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 8000),
  retries: Number(process.env.LLM_RETRIES ?? 2),
  redactKeys: ['apiKey', 'apiSecret', 'token', 'access_token', 'refresh_token', 'password'],
  maxPromptChars: Number(process.env.LLM_MAX_PROMPT_CHARS ?? 4000),
};

// ─── Helpers ──────────────────────────────────────────────────

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

export function estimateUsage(
  prompt: string,
  completion: string,
  provider: LLMProvider = 'openai',
): LLMUsage {
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(completion.length / 4);
  const totalTokens = promptTokens + completionTokens;
  const cfg = PROVIDER_CONFIGS[provider];
  const estimatedUsd = Number(
    (promptTokens * cfg.costPer1k[0] / 1000 + completionTokens * cfg.costPer1k[1] / 1000).toFixed(6),
  );
  return { promptTokens, completionTokens, totalTokens, estimatedUsd, provider };
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

/**
 * Build the failover chain starting from the preferred provider.
 */
function buildFailoverChain(preferred?: LLMProvider): LLMProvider[] {
  if (!preferred) return FAILOVER_CHAIN;
  const rest = FAILOVER_CHAIN.filter((p) => p !== preferred);
  return [preferred, ...rest];
}

/**
 * Resolve the model name for a given provider.
 * If the caller specified a model from a different provider family,
 * fall back to the provider's default model.
 */
function resolveModel(model: string | undefined, provider: LLMProvider): string {
  if (!model) return PROVIDER_CONFIGS[provider].defaultModel;
  // If the model clearly belongs to another provider, use the target's default
  const isOpenAIModel = model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3');
  const isAnthropicModel = model.startsWith('claude-');
  const isGrokModel = model.startsWith('grok-');
  const isVertexModel = model.startsWith('gemini-');
  if (provider === 'openai' && !isOpenAIModel) return PROVIDER_CONFIGS[provider].defaultModel;
  if (provider === 'anthropic' && !isAnthropicModel) return PROVIDER_CONFIGS[provider].defaultModel;
  if (provider === 'grok' && !isGrokModel) return PROVIDER_CONFIGS[provider].defaultModel;
  if (provider === 'vertex' && !isVertexModel) return PROVIDER_CONFIGS[provider].defaultModel;
  return model;
}

// ─── Core Router ──────────────────────────────────────────────

/**
 * Send a prompt to the best available LLM provider.
 *
 * 1. Try the preferred provider (from options or default).
 * 2. Retry up to `retries` times on transient failures.
 * 3. If all retries fail, failover to the next provider in chain.
 * 4. If every provider is exhausted, return LLM_FALLBACK string.
 */
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
    provider: options.provider,
  };

  const safePrompt = redactText(sanitizePrompt(prompt, cfg.maxPromptChars), cfg.redactKeys);
  const messages: Array<{ role: string; content: string }> = [
    ...(cfg.systemPrompt ? [{ role: 'system', content: cfg.systemPrompt }] : []),
    { role: 'user', content: safePrompt },
  ];

  if (typeof fetch === 'undefined') {
    return `LLM: ${safePrompt}`;
  }

  const chain = buildFailoverChain(cfg.provider);
  let lastError = '';

  for (const providerName of chain) {
    const providerCfg = PROVIDER_CONFIGS[providerName];
    const apiKey = process.env[providerCfg.envKey]
      ?? (providerName === 'vertex' ? process.env.GOOGLE_API_KEY : undefined);
    if (!apiKey) continue; // skip providers without keys

    const model = resolveModel(cfg.model, providerName);

    for (let attempt = 0; attempt <= cfg.retries; attempt++) {
      try {
        const { headers, body } = providerCfg.buildRequest(model, messages, cfg.maxTokens, apiKey);
        const endpoint = providerCfg.resolveEndpoint
          ? providerCfg.resolveEndpoint(model, apiKey)
          : providerCfg.endpoint;
        const resp = await fetchWithTimeout(
          endpoint,
          { method: 'POST', headers, body },
          cfg.timeoutMs,
        );

        if (!resp.ok) {
          const errBody = await resp.text();
          throw new Error(`llm_${providerName}_http_${resp.status}:${errBody.slice(0, 300)}`);
        }

        const data = await resp.json();
        const content = providerCfg.parseResponse(data);

        if (cfg.asJson) {
          try {
            JSON.parse(content);
          } catch {
            return JSON.stringify({ response: content });
          }
        }

        if (process.env.LLM_DEBUG === 'true') {
          const usage = estimateUsage(safePrompt, content, providerName);
          console.log(`[LLM ${providerName}/${model}]`, usage);
        }

        return content;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < cfg.retries) {
          await sleep(250 * (attempt + 1));
        }
      }
    }
    // All retries for this provider failed — try next provider
    if (process.env.LLM_DEBUG === 'true') {
      console.warn(`[LLM failover] ${providerName} exhausted, trying next provider`);
    }
  }

  console.warn('LLM call failed across all providers:', lastError);
  return `LLM_FALLBACK: ${safePrompt}`;
}

// ─── Template-based Prompt Execution ──────────────────────────

/**
 * Execute a structured prompt template via the LLM.
 * Automatically routes to the template's preferred provider.
 * Returns the parsed typed output on success, or null if the LLM is
 * unavailable or the response can't be parsed.
 */
export async function promptWithTemplate<TInput, TOutput>(
  template: PromptTemplate<TInput, TOutput>,
  input: TInput,
  options: Omit<LLMOptions, 'systemPrompt' | 'asJson'> = {},
): Promise<{ result: TOutput | null; raw: string; usage: LLMUsage }> {
  const userPrompt = template.buildUserPrompt(input);
  const provider = (options.provider ?? template.provider) as LLMProvider | undefined;
  const raw = await promptLLM(userPrompt, {
    ...options,
    systemPrompt: template.system,
    model: options.model ?? template.model,
    maxTokens: options.maxTokens ?? template.maxTokens,
    provider,
    asJson: true,
  });

  const usage = estimateUsage(template.system + userPrompt, raw, provider ?? 'openai');
  const result = template.parseResponse(raw);
  return { result, raw, usage };
}
