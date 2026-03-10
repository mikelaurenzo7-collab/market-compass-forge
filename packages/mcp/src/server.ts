export function startMcpServer() {
  return {
    name: 'beastbots-mcp',
    capabilities: ['operator_catalog', 'integration_status', 'safety_review']
  };
}
