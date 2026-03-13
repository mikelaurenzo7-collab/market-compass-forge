import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PROVIDER_CONFIGS,
  estimateUsage,
  type LLMProvider,
} from '../llm';

// ─── Provider Configuration ───────────────────────────────────

describe('PROVIDER_CONFIGS', () => {
  it('has openai, anthropic, grok, and vertex providers', () => {
    expect(PROVIDER_CONFIGS).toHaveProperty('openai');
    expect(PROVIDER_CONFIGS).toHaveProperty('anthropic');
    expect(PROVIDER_CONFIGS).toHaveProperty('grok');
    expect(PROVIDER_CONFIGS).toHaveProperty('vertex');
  });

  it('each provider has required fields', () => {
    for (const [name, cfg] of Object.entries(PROVIDER_CONFIGS)) {
      expect(cfg.name).toBe(name);
      expect(cfg.endpoint).toMatch(/^https:\/\//);
      expect(cfg.envKey).toBeTruthy();
      expect(cfg.defaultModel).toBeTruthy();
      expect(cfg.costPer1k).toHaveLength(2);
      expect(typeof cfg.buildRequest).toBe('function');
      expect(typeof cfg.parseResponse).toBe('function');
    }
  });
});

// ─── OpenAI Request / Response Format ─────────────────────────

describe('OpenAI provider', () => {
  const cfg = PROVIDER_CONFIGS.openai;

  it('builds correct request headers and body', () => {
    const { headers, body } = cfg.buildRequest(
      'gpt-4o-mini',
      [{ role: 'user', content: 'hello' }],
      100,
      'sk-test',
    );
    expect(headers['Authorization']).toBe('Bearer sk-test');
    expect(headers['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(body);
    expect(parsed.model).toBe('gpt-4o-mini');
    expect(parsed.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(parsed.max_tokens).toBe(100);
    expect(parsed.temperature).toBe(0.2);
  });

  it('parses OpenAI response format', () => {
    const data = {
      choices: [{ message: { content: '  Hello world  ' } }],
    };
    expect(cfg.parseResponse(data)).toBe('Hello world');
  });

  it('returns fallback for empty response', () => {
    expect(cfg.parseResponse({})).toBe('[no response]');
    expect(cfg.parseResponse({ choices: [] })).toBe('[no response]');
  });
});

// ─── Anthropic Request / Response Format ──────────────────────

describe('Anthropic provider', () => {
  const cfg = PROVIDER_CONFIGS.anthropic;

  it('builds correct request with system extracted', () => {
    const { headers, body } = cfg.buildRequest(
      'claude-sonnet-4-20250514',
      [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'hello' },
      ],
      200,
      'sk-ant-test',
    );
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const parsed = JSON.parse(body);
    expect(parsed.system).toBe('You are helpful');
    expect(parsed.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(parsed.max_tokens).toBe(200);
  });

  it('omits system field when no system message', () => {
    const { body } = cfg.buildRequest(
      'claude-sonnet-4-20250514',
      [{ role: 'user', content: 'hi' }],
      100,
      'sk-ant-test',
    );
    const parsed = JSON.parse(body);
    expect(parsed.system).toBeUndefined();
  });

  it('parses Anthropic response format', () => {
    const data = {
      content: [{ type: 'text', text: '  Hello from Claude  ' }],
    };
    expect(cfg.parseResponse(data)).toBe('Hello from Claude');
  });

  it('returns fallback for empty content', () => {
    expect(cfg.parseResponse({})).toBe('[no response]');
    expect(cfg.parseResponse({ content: [] })).toBe('[no response]');
  });
});

// ─── Grok Request / Response Format ───────────────────────────

describe('Grok provider', () => {
  const cfg = PROVIDER_CONFIGS.grok;

  it('builds OpenAI-compatible request with Bearer auth', () => {
    const { headers, body } = cfg.buildRequest(
      'grok-3-mini',
      [{ role: 'user', content: 'hello' }],
      150,
      'xai-test',
    );
    expect(headers['Authorization']).toBe('Bearer xai-test');
    const parsed = JSON.parse(body);
    expect(parsed.model).toBe('grok-3-mini');
  });

  it('parses Grok response (OpenAI-compatible format)', () => {
    const data = {
      choices: [{ message: { content: ' Grok says hi ' } }],
    };
    expect(cfg.parseResponse(data)).toBe('Grok says hi');
  });
});

// ─── Vertex provider ───────────────────────────────────────────

describe('Vertex provider', () => {
  const cfg = PROVIDER_CONFIGS.vertex;

  it('builds Gemini-compatible request payload', () => {
    const { headers, body } = cfg.buildRequest(
      'gemini-2.5-flash',
      [
        { role: 'system', content: 'You are precise.' },
        { role: 'user', content: 'Analyze this input.' },
      ],
      180,
      'vertex-key',
    );
    expect(headers['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(body);
    expect(parsed.systemInstruction.parts[0].text).toContain('You are precise');
    expect(parsed.contents[0].parts[0].text).toContain('Analyze this input');
    expect(parsed.generationConfig.maxOutputTokens).toBe(180);
  });

  it('parses Gemini response format', () => {
    const data = {
      candidates: [{ content: { parts: [{ text: ' Vertex says hi ' }] } }],
    };
    expect(cfg.parseResponse(data)).toBe('Vertex says hi');
  });
});

// ─── estimateUsage ────────────────────────────────────────────

describe('estimateUsage', () => {
  it('estimates tokens from character counts', () => {
    const usage = estimateUsage('Hello world', 'Hi there');
    expect(usage.promptTokens).toBe(Math.ceil(11 / 4));
    expect(usage.completionTokens).toBe(Math.ceil(8 / 4));
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
  });

  it('includes provider in usage', () => {
    const usage = estimateUsage('test', 'result', 'anthropic');
    expect(usage.provider).toBe('anthropic');
  });

  it('defaults to openai provider', () => {
    const usage = estimateUsage('test', 'result');
    expect(usage.provider).toBe('openai');
  });

  it('uses provider-specific cost rates', () => {
    const oai = estimateUsage('test prompt', 'test response', 'openai');
    const anth = estimateUsage('test prompt', 'test response', 'anthropic');
    // Anthropic costs more per token
    expect(anth.estimatedUsd).toBeGreaterThan(oai.estimatedUsd);
  });
});

// ─── promptLLM with DISABLE_LLM ──────────────────────────────

describe('promptLLM', () => {
  let origDisable: string | undefined;

  beforeEach(() => {
    origDisable = process.env.DISABLE_LLM;
    process.env.DISABLE_LLM = 'true';
  });
  afterEach(() => {
    if (origDisable === undefined) delete process.env.DISABLE_LLM;
    else process.env.DISABLE_LLM = origDisable;
  });

  it('returns disabled message when DISABLE_LLM=true', async () => {
    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test prompt');
    expect(result).toBe('[LLM disabled]');
  });
});

// ─── promptLLM with mocked fetch (cross-provider failover) ───

describe('promptLLM with fetch mock', () => {
  let origDisable: string | undefined;
  let origOAI: string | undefined;
  let origAnthropic: string | undefined;
  let origGrok: string | undefined;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    origDisable = process.env.DISABLE_LLM;
    origOAI = process.env.OAI_API_KEY;
    origAnthropic = process.env.ANTHROPIC_API_KEY;
    origGrok = process.env.GROK_API_KEY;
    delete process.env.DISABLE_LLM;
    process.env.OAI_API_KEY = 'test-oai';
    process.env.ANTHROPIC_API_KEY = 'test-anth';
    process.env.GROK_API_KEY = 'test-grok';
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (origDisable === undefined) delete process.env.DISABLE_LLM;
    else process.env.DISABLE_LLM = origDisable;
    if (origOAI === undefined) delete process.env.OAI_API_KEY;
    else process.env.OAI_API_KEY = origOAI;
    if (origAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = origAnthropic;
    if (origGrok === undefined) delete process.env.GROK_API_KEY;
    else process.env.GROK_API_KEY = origGrok;
  });

  it('routes to preferred provider', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Claude response' }],
      }),
    });

    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test', { provider: 'anthropic', retries: 0 });
    expect(result).toBe('Claude response');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0];
    expect(url).toContain('anthropic.com');
  });

  it('fails over from OpenAI to Anthropic on error', async () => {
    let callCount = 0;
    fetchSpy.mockImplementation((url: string) => {
      callCount++;
      if (url.includes('openai.com')) {
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve('rate limited'),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text: 'Anthropic fallback' }],
        }),
      });
    });

    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test', { provider: 'openai', retries: 0 });
    expect(result).toBe('Anthropic fallback');
    // Should have tried openai (1 attempt) then anthropic (1 attempt)
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('skips providers without API keys', async () => {
    delete process.env.OAI_API_KEY;

    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Anthropic response' }],
      }),
    });

    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test', { retries: 0 });
    expect(result).toBe('Anthropic response');
    const url = fetchSpy.mock.calls[0][0];
    expect(url).toContain('anthropic.com');
  });

  it('returns LLM_FALLBACK when all providers fail', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('error'),
    });

    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test prompt', { retries: 0 });
    expect(result).toMatch(/^LLM_FALLBACK:/);
    expect(result).toContain('test prompt');
  });

  it('wraps non-JSON response in JSON object when asJson=true', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    });

    const { promptLLM } = await import('../llm');
    const result = await promptLLM('test', { asJson: true, retries: 0 });
    const parsed = JSON.parse(result);
    expect(parsed.response).toBe('not valid json');
  });
});

// ─── Template provider routing ────────────────────────────────

describe('prompt template provider assignments', () => {
  it('TRADING_INSIGHT_TEMPLATE routes to anthropic', async () => {
    const { TRADING_INSIGHT_TEMPLATE } = await import('../prompts');
    expect(TRADING_INSIGHT_TEMPLATE.provider).toBe('anthropic');
    expect(TRADING_INSIGHT_TEMPLATE.model).toContain('claude');
  });

  it('SENTIMENT_ANALYSIS_TEMPLATE routes to anthropic', async () => {
    const { SENTIMENT_ANALYSIS_TEMPLATE } = await import('../prompts');
    expect(SENTIMENT_ANALYSIS_TEMPLATE.provider).toBe('anthropic');
  });

  it('SOCIAL_CONTENT_TEMPLATE routes to openai gpt-4o', async () => {
    const { SOCIAL_CONTENT_TEMPLATE } = await import('../prompts');
    expect(SOCIAL_CONTENT_TEMPLATE.provider).toBe('openai');
    expect(SOCIAL_CONTENT_TEMPLATE.model).toBe('gpt-4o');
  });

  it('PRICING_INSIGHT_TEMPLATE routes to openai gpt-4o-mini', async () => {
    const { PRICING_INSIGHT_TEMPLATE } = await import('../prompts');
    expect(PRICING_INSIGHT_TEMPLATE.provider).toBe('openai');
    expect(PRICING_INSIGHT_TEMPLATE.model).toBe('gpt-4o-mini');
  });
});
