import { Hono } from 'hono';
import type { Context } from 'hono';
import { startMcpServer } from '@beastbots/mcp';

// instantiate singleton MCP logic (tools already registered)
const mcp = startMcpServer();

const router = new Hono();

router.post('/mcp', async (c: Context) => {
  const body = await c.req.json();
  const method = body.method as string;
  const params = body.params as any;
  let result;
  if (method === 'tools/call') {
    const name = params?.name as string;
    const args = params?.arguments as Record<string, unknown> || {};
    result = mcp.handleToolCall(name, args);
  } else {
    result = mcp.handleToolCall(method, params || {});
  }
  return c.json({ jsonrpc: '2.0', id: body.id ?? null, result });
});

export default router;