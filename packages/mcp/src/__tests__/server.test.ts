import { startMcpServer, getTool, listTools } from '../server';

describe('MCP server', () => {
  it('starts and returns server metadata', () => {
    const server = startMcpServer();
    expect(server.name).toBe('beastbots-mcp');
    expect(server.version).toBe('0.1.0');
    expect(Array.isArray(server.capabilities)).toBe(true);
    expect(server.capabilities).toContain('safety_review');
    expect(server.capabilities).toContain('kill_switch');
  });

  it('exposes the expected tools', () => {
    const server = startMcpServer();
    const names = server.tools.map((t) => t.name);
    expect(names).toContain('list_operators');
    expect(names).toContain('get_integration_status');
    expect(names).toContain('submit_safety_review');
    expect(names).toContain('get_budget_status');
    expect(names).toContain('trip_kill_switch');
  });

  it('getTool returns correct tool by name', () => {
    const tool = getTool('submit_safety_review');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema).toBeDefined();
  });

  it('getTool returns undefined for unknown tool', () => {
    expect(getTool('nonexistent')).toBeUndefined();
  });

  it('listTools returns all tools', () => {
    expect(listTools().length).toBeGreaterThanOrEqual(5);
  });

  it('all tools have required inputSchema', () => {
    for (const tool of listTools()) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });
});
