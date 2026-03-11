export interface McpCall {
  name: string;
  args?: Record<string, unknown>;
}

export async function callMcp(tool: McpCall): Promise<any> {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: tool.name,
      arguments: tool.args || {},
    },
  };
  const res = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return json.result;
}
