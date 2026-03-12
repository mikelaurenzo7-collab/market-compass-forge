import { Hono } from 'hono';
import type { Context } from 'hono';
import { startMcpServer } from '@beastbots/mcp';
import { verifyAuthHeader } from '../lib/auth.js';

// instantiate singleton MCP logic (tools already registered)
const mcp = startMcpServer();

const router = new Hono();

router.post('/mcp', async (c: Context) => {
  // Require authentication — MCP tools expose internal platform data
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Unauthorized' } }, 401);
  }

  const body = await c.req.json();
  const method = body.method as string;
  const params = body.params as Record<string, unknown> | undefined;
  let result;
  if (method === 'tools/call') {
    const name = params?.name as string;
    const args = (params?.arguments as Record<string, unknown>) || {};
    result = mcp.handleToolCall(name, args);
  } else {
    result = mcp.handleToolCall(method, params || {});
  }
  return c.json({ jsonrpc: '2.0', id: body.id ?? null, result });
});

export default router;