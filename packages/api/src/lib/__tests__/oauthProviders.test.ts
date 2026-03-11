import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAdapter } from '../oauthProviders.js';

// set dummy env for tests
process.env.OAUTH_COINBASE_AUTHORIZE_URL = 'https://coinbase.com/oauth/authorize';
process.env.OAUTH_COINBASE_TOKEN_URL = 'https://coinbase.com/oauth/token';
process.env.OAUTH_COINBASE_CLIENT_ID = 'cb-id';
process.env.OAUTH_COINBASE_CLIENT_SECRET = 'cb-secret';
process.env.OAUTH_COINBASE_SCOPES = 'trade';

process.env.OAUTH_SHOPIFY_AUTHORIZE_URL = 'https://shopify.com/oauth/authorize';
process.env.OAUTH_SHOPIFY_TOKEN_URL = 'https://shopify.com/oauth/token';
process.env.OAUTH_SHOPIFY_CLIENT_ID = 'sh-id';
process.env.OAUTH_SHOPIFY_CLIENT_SECRET = 'sh-secret';
process.env.OAUTH_SHOPIFY_SCOPES = 'read_products';

process.env.OAUTH_X_AUTHORIZE_URL = 'https://twitter.com/oauth/authorize';
process.env.OAUTH_X_TOKEN_URL = 'https://twitter.com/oauth/token';
process.env.OAUTH_X_CLIENT_ID = 'x-id';
process.env.OAUTH_X_CLIENT_SECRET = 'x-secret';
process.env.OAUTH_X_SCOPES = 'tweet.read';


describe('OAuth provider adapters', () => {
  it('coinbase authorize URL includes expected params', () => {
    const adapter = getAdapter('coinbase');
    const { url } = adapter.authorizeUrl({
      provider: 'coinbase',
      redirectUri: 'https://app/cb/cb',
      state: 'mystate',
    });
    const u = new URL(url);
    expect(u.origin).toBe('https://coinbase.com');
    expect(u.pathname).toBe('/oauth/authorize');
    expect(u.searchParams.get('client_id')).toBe('cb-id');
    expect(u.searchParams.get('redirect_uri')).toBe('https://app/cb/cb');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe('trade');
    expect(u.searchParams.get('state')).toBe('mystate');
  });

  it('shopify authorize URL requires shop param', () => {
    const adapter = getAdapter('shopify');
    expect(() => adapter.authorizeUrl({ provider: 'shopify', redirectUri: 'x', state: 's' })).toThrow();
    const { url } = adapter.authorizeUrl({
      provider: 'shopify',
      redirectUri: 'https://app/sh/cb',
      state: 'foo',
      query: { shop: 'example.myshopify.com' },
    });
    const u = new URL(url);
    expect(u.searchParams.get('shop')).toBe('example.myshopify.com');
    expect(u.searchParams.get('client_id')).toBe('sh-id');
  });

  it('x (twitter) authorize URL includes PKCE params', () => {
    const adapter = getAdapter('x');
    const { url, stateData } = adapter.authorizeUrl({
      provider: 'x',
      redirectUri: 'https://app/x/cb',
      state: 'twstate',
    });
    const u = new URL(url);
    expect(u.origin).toBe('https://twitter.com');
    expect(u.pathname).toBe('/oauth/authorize');
    expect(u.searchParams.get('client_id')).toBe('x-id');
    expect(u.searchParams.get('redirect_uri')).toBe('https://app/x/cb');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe('tweet.read');
    expect(u.searchParams.get('state')).toBe('twstate');
    expect(u.searchParams.get('code_challenge')).toBeDefined();
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(stateData).toHaveProperty('code_verifier');
  });

  it('withdraws token via POST for coinbase using fetch', async () => {
    const adapter = getAdapter('coinbase');
    const fakeResponse = { access_token: 'abc' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fakeResponse });
    global.fetch = fetchMock as any;
    const result = await adapter.exchangeToken({ provider: 'coinbase', code: '1234', redirectUri: 'r' });
    expect(result).toEqual(fakeResponse);
    expect(fetchMock).toHaveBeenCalled();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://coinbase.com/oauth/token');
    expect(opts.method).toBe('POST');
    const body = new URLSearchParams(opts.body as any);
    expect(body.get('code')).toBe('1234');
  });

  it('shopify token exchange uses JSON POST', async () => {
    const adapter = getAdapter('shopify');
    const fake = { access_token: 'tok' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fake });
    global.fetch = fetchMock as any;
    const res = await adapter.exchangeToken({ provider: 'shopify', code: 'c', redirectUri: 'u' });
    expect(res).toEqual(fake);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://shopify.com/oauth/token');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toMatchObject({ code: 'c', client_id: 'sh-id' });
  });

  it('x token exchange includes code_verifier', async () => {
    const adapter = getAdapter('x');
    const fake = { access_token: 'xtok' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fake });
    global.fetch = fetchMock as any;
    const res = await adapter.exchangeToken({ provider: 'x', code: 'xc', redirectUri: 'xu', stateData: { code_verifier: 'ver' } });
    expect(res).toEqual(fake);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://twitter.com/oauth/token');
    expect(opts.method).toBe('POST');
    const body = new URLSearchParams(opts.body as any);
    expect(body.get('code_verifier')).toBe('ver');
  });
});
