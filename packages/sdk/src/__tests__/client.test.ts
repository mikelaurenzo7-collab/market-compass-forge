import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BeastBotsClient, createClient } from '../index.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data: unknown, success = true, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ success, data }),
    text: () => Promise.resolve(JSON.stringify({ success, data })),
  };
}

describe('BeastBotsClient', () => {
  let client: BeastBotsClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createClient({ apiUrl: 'https://api.beastbots.io', apiKey: 'test-key' });
  });

  it('createClient returns BeastBotsClient instance', () => {
    expect(client).toBeInstanceOf(BeastBotsClient);
  });

  it('sends Authorization header on all requests', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ service: 'BeastBots', status: 'ok', version: '0.1.0' }));
    await client.health();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.beastbots.io/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('strips trailing slash from URL', async () => {
    const c = createClient({ apiUrl: 'https://api.beastbots.io/', apiKey: 'k' });
    mockFetch.mockResolvedValueOnce(mockResponse({ service: 'BeastBots', status: 'ok', version: '0.1.0' }));
    await c.health();
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/health', expect.anything());
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    await expect(client.health()).rejects.toThrow('BeastBots API error (401): Unauthorized');
  });

  it('throws on success:false response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: false, error: 'Something went wrong' }),
    });
    await expect(client.health()).rejects.toThrow('Something went wrong');
  });

  // ─── Health ─────────────────────────────────────

  it('health() calls /api/health', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ service: 'BeastBots', status: 'ok', version: '0.1.0' }));
    const result = await client.health();
    expect(result).toEqual({ service: 'BeastBots', status: 'ok', version: '0.1.0' });
  });

  // ─── Integrations ──────────────────────────────

  it('listIntegrations() calls /api/integrations', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ id: 'coinbase', name: 'Coinbase' }]));
    const result = await client.listIntegrations();
    expect(result).toEqual([{ id: 'coinbase', name: 'Coinbase' }]);
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/integrations', expect.anything());
  });

  it('listIntegrations() passes category filter', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.listIntegrations('trading');
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/integrations?category=trading', expect.anything());
  });

  it('getIntegration() calls /api/integrations/:id', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'coinbase', name: 'Coinbase' }));
    const result = await client.getIntegration('coinbase');
    expect(result.id).toBe('coinbase');
  });

  // ─── Pricing ───────────────────────────────────

  it('listPricing() calls /api/pricing', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ tier: 'starter' }]));
    const result = await client.listPricing();
    expect(result).toEqual([{ tier: 'starter' }]);
  });

  it('listPricing() passes family filter', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.listPricing('trading');
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/pricing/trading', expect.anything());
  });

  // ─── Bots ──────────────────────────────────────

  it('listBots() calls /api/bots', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.listBots('tenant-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bots?tenantId=tenant-1'),
      expect.anything(),
    );
  });

  it('createBot() sends POST to /api/bots', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'bot-1', name: 'MyBot', family: 'trading', platform: 'coinbase', status: 'idle' }));
    const result = await client.createBot({
      tenantId: 't1',
      family: 'trading',
      platform: 'coinbase',
      name: 'MyBot',
    });
    expect(result.id).toBe('bot-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.beastbots.io/api/bots',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('startBot() sends POST to /api/bots/:id/start', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'bot-1', status: 'running' }));
    const result = await client.startBot('bot-1');
    expect(result.status).toBe('running');
  });

  it('pauseBot() sends POST', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'bot-1', status: 'paused' }));
    const result = await client.pauseBot('bot-1');
    expect(result.status).toBe('paused');
  });

  it('stopBot() sends POST', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'bot-1', status: 'stopped' }));
    const result = await client.stopBot('bot-1');
    expect(result.status).toBe('stopped');
  });

  it('killBot() sends POST', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 'bot-1', status: 'stopped' }));
    const result = await client.killBot('bot-1');
    expect(result.status).toBe('stopped');
  });

  it('deleteBot() sends DELETE', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ deleted: true }));
    const result = await client.deleteBot('bot-1');
    expect(result.deleted).toBe(true);
  });

  // ─── Safety ────────────────────────────────────

  it('getSafetyDefaults() calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ policies: [], budget: {}, circuitBreaker: {} }));
    const result = await client.getSafetyDefaults('trading');
    expect(result.policies).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.beastbots.io/api/safety/defaults/trading',
      expect.anything(),
    );
  });

  // ─── Platform Capabilities ─────────────────────

  it('getTradingPlatforms() calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.getTradingPlatforms();
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/bots/platforms/trading', expect.anything());
  });

  it('getStorePlatforms() calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.getStorePlatforms();
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/bots/platforms/store', expect.anything());
  });

  it('getSocialPlatforms() calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await client.getSocialPlatforms();
    expect(mockFetch).toHaveBeenCalledWith('https://api.beastbots.io/api/bots/platforms/social', expect.anything());
  });
});
