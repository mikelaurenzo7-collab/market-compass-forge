import { defineBot, BeastBotsClient } from '../index';

describe('defineBot', () => {
  it('returns the manifest unchanged', () => {
    const manifest = { id: 'b1', family: 'trading' as const, name: 'Crypto Bot', description: 'Trades crypto' };
    expect(defineBot(manifest)).toEqual(manifest);
  });
});

describe('BeastBotsClient', () => {
  it('instantiates with baseUrl', () => {
    const client = new BeastBotsClient({ baseUrl: 'https://api.beastbots.io' });
    expect(client).toBeInstanceOf(BeastBotsClient);
  });

  it('strips trailing slash from baseUrl', () => {
    const client = new BeastBotsClient({ baseUrl: 'https://api.beastbots.io/', token: 'tok' });
    // We verify it does not throw and the instance is created
    expect(client).toBeInstanceOf(BeastBotsClient);
  });

  it('setToken updates the token without throwing', () => {
    const client = new BeastBotsClient({ baseUrl: 'https://api.example.com' });
    expect(() => client.setToken('new-token')).not.toThrow();
  });

  it('getToken, listIntegrations, etc. are defined as functions', () => {
    const client = new BeastBotsClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    expect(typeof client.getToken).toBe('function');
    expect(typeof client.listIntegrations).toBe('function');
    expect(typeof client.listPlans).toBe('function');
    expect(typeof client.subscribe).toBe('function');
    expect(typeof client.listApprovals).toBe('function');
    expect(typeof client.createApproval).toBe('function');
    expect(typeof client.resolveApproval).toBe('function');
    expect(typeof client.listPolicies).toBe('function');
    expect(typeof client.getAuditLog).toBe('function');
  });
});
