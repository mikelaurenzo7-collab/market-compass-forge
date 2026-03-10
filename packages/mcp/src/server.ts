export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  name: string;
  version: string;
  capabilities: string[];
  tools: McpTool[];
}

const TOOLS: McpTool[] = [
  {
    name: 'list_operators',
    description: 'List all available bot operators and their current status.',
    inputSchema: {
      type: 'object',
      properties: {
        family: {
          type: 'string',
          enum: ['trading', 'store', 'social', 'workforce'],
          description: 'Optional filter by bot family.',
        },
      },
    },
  },
  {
    name: 'get_integration_status',
    description: 'Return the current status of a specific third-party integration.',
    inputSchema: {
      type: 'object',
      properties: {
        integrationId: { type: 'string', description: 'Integration ID (e.g. coinbase, shopify).' },
      },
      required: ['integrationId'],
    },
  },
  {
    name: 'submit_safety_review',
    description: 'Submit an action for human safety review before execution.',
    inputSchema: {
      type: 'object',
      properties: {
        botId: { type: 'string' },
        action: { type: 'string' },
        payload: { type: 'object' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['botId', 'action', 'payload', 'riskLevel'],
    },
  },
  {
    name: 'get_budget_status',
    description: 'Return remaining budget and usage for a bot instance.',
    inputSchema: {
      type: 'object',
      properties: {
        botId: { type: 'string' },
      },
      required: ['botId'],
    },
  },
  {
    name: 'trip_kill_switch',
    description: 'Immediately halt all autonomous operations for a tenant.',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['tenantId'],
    },
  },
];

export function startMcpServer(): McpServer {
  return {
    name: 'beastbots-mcp',
    version: '0.1.0',
    capabilities: ['operator_catalog', 'integration_status', 'safety_review', 'budget_status', 'kill_switch'],
    tools: TOOLS,
  };
}

export function getTool(name: string): McpTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

export function listTools(): McpTool[] {
  return TOOLS;
}
