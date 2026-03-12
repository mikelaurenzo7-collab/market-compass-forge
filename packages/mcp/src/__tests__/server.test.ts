import { describe, expect, it } from 'vitest';
import { startMcpServer, startHttpServer } from '../server.js';
// fetch is provided by Node 18+ globally in tests


describe('MCP Server', () => {
  const mcp = startMcpServer();
  let httpServer: any;

  it('can start HTTP listener and respond to RPC', async () => {
    httpServer = startHttpServer(5001);
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    };
    // global fetch available in Node
    const resp = await fetch('http://localhost:5001/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    expect(json.result.tools.length).toBeGreaterThan(0);
    httpServer.close();
  });

  it('returns server metadata', () => {
    expect(mcp.name).toBe('beastbots-mcp');
    expect(mcp.capabilities.length).toBeGreaterThan(0);
    expect(mcp.tools.length).toBe(6);
  });

  it('lists all tool names', () => {
    const names = mcp.tools.map((t) => t.name);
    expect(names).toContain('operator_catalog');
    expect(names).toContain('integration_status');
    expect(names).toContain('safety_review');
    expect(names).toContain('pricing_info');
    expect(names).toContain('market_intelligence');
    expect(names).toContain('alert_management');
  });

  // ─── operator_catalog ──────────────────────────

  it('operator_catalog returns full catalog', () => {
    const result = mcp.handleToolCall('operator_catalog', {}) as any;
    expect(result.integrations).toBeDefined();
    expect(result.integrations.length).toBeGreaterThan(0);
    expect(result.tradingPlatforms).toBeDefined();
    expect(result.storePlatforms).toBeDefined();
    expect(result.socialPlatforms).toBeDefined();
  });

  it('operator_catalog filters by category', () => {
    const result = mcp.handleToolCall('operator_catalog', { category: 'trading' }) as any;
    for (const i of result.integrations) {
      expect(i.category).toBe('trading');
    }
  });

  // ─── integration_status ────────────────────────

  it('integration_status returns summary', () => {
    const result = mcp.handleToolCall('integration_status', {}) as any;
    expect(result.total).toBeGreaterThan(0);
    expect(result.byStatus).toBeDefined();
    expect(result.byCategory).toBeDefined();
  });

  it('integration_status returns specific integration', () => {
    const result = mcp.handleToolCall('integration_status', { id: 'coinbase' }) as any;
    expect(result.id).toBe('coinbase');
  });

  it('integration_status returns error for unknown ID', () => {
    const result = mcp.handleToolCall('integration_status', { id: 'unknown-xyz' }) as any;
    expect(result.error).toBeDefined();
  });

  // ─── safety_review ─────────────────────────────

  it('safety_review returns 5-layer model', () => {
    const result = mcp.handleToolCall('safety_review', { family: 'trading' }) as any;
    expect(result.family).toBe('trading');
    expect(result.safetyLayers).toBeDefined();
    expect(result.safetyLayers['1_policies']).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('safety_review defaults to trading', () => {
    const result = mcp.handleToolCall('safety_review', {}) as any;
    expect(result.family).toBe('trading');
  });

  // ─── pricing_info ──────────────────────────────

  it('pricing_info returns all plans', () => {
    const result = mcp.handleToolCall('pricing_info', {}) as any;
    expect(result.plans.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
  });

  it('pricing_info filters by family', () => {
    const result = mcp.handleToolCall('pricing_info', { family: 'trading' }) as any;
    for (const p of result.plans) {
      expect(p.family).toBe('trading');
    }
  });

  // ─── Error handling ────────────────────────────

  it('returns error for unknown tool', () => {
    const result = mcp.handleToolCall('nonexistent_tool', {}) as any;
    expect(result.error).toBeDefined();
  });
});
