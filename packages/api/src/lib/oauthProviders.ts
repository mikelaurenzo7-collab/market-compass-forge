import { URL, URLSearchParams } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { getDb } from './db.js';
import { encrypt } from './crypto.js';

export interface OAuthAdapter {
  authorizeUrl(opts: {
    provider: string;
    redirectUri: string;
    state: string;
    query?: Record<string, string>;
  }): { url: string; stateData?: any };

  exchangeToken(opts: {
    provider: string;
    code: string;
    redirectUri: string;
    stateData?: any;
  }): Promise<any>;
}

function envKey(provider: string, key: string): string {
  return `OAUTH_${provider.toUpperCase()}_${key}`;
}

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

const defaultAdapter: OAuthAdapter = {
  authorizeUrl({ provider, redirectUri, state }) {
    const authorizeUrl = process.env[envKey(provider, 'AUTHORIZE_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const scopes = process.env[envKey(provider, 'SCOPES')] ?? '';
    if (!authorizeUrl || !clientId) {
      throw new Error('missing_oauth_config');
    }
    const url = new URL(authorizeUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    if (scopes) url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    return { url: url.toString() };
  },

  async exchangeToken({ provider, code, redirectUri }) {
    const tokenUrl = process.env[envKey(provider, 'TOKEN_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const clientSecret = process.env[envKey(provider, 'CLIENT_SECRET')];
    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error('missing_oauth_config');
    }

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!resp.ok) {
      throw new Error(`token_exchange_error:${resp.status}`);
    }
    return resp.json();
  },
};

// Shopify is mostly OAuth2 but requires `shop` parameter on authorization URL
const shopifyAdapter: OAuthAdapter = {
  authorizeUrl({ provider, redirectUri, state, query }) {
    // shop must be provided in query
    const shop = query?.shop;
    if (!shop) throw new Error('shop_required');
    const base = process.env[envKey(provider, 'AUTHORIZE_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const scopes = process.env[envKey(provider, 'SCOPES')] ?? '';
    if (!base || !clientId) throw new Error('missing_oauth_config');
    const url = new URL(base);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('shop', shop);
    return { url: url.toString() };
  },

  async exchangeToken({ provider, code, redirectUri }) {
    // note: Shopify token exchange expects POST with JSON body
    const tokenUrl = process.env[envKey(provider, 'TOKEN_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const clientSecret = process.env[envKey(provider, 'CLIENT_SECRET')];
    if (!tokenUrl || !clientId || !clientSecret) throw new Error('missing_oauth_config');
    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    if (!resp.ok) {
      throw new Error(`token_exchange_error:${resp.status}`);
    }
    return resp.json();
  },
};

// PKCE adapter for providers that require Proof Key for Code Exchange (e.g., Twitter)
const pkceAdapter: OAuthAdapter = {
  authorizeUrl({ provider, redirectUri, state }) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const authorizeUrl = process.env[envKey(provider, 'AUTHORIZE_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const scopes = process.env[envKey(provider, 'SCOPES')] ?? '';
    if (!authorizeUrl || !clientId) {
      throw new Error('missing_oauth_config');
    }
    const url = new URL(authorizeUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    if (scopes) url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return { url: url.toString(), stateData: { code_verifier: codeVerifier } };
  },

  async exchangeToken({ provider, code, redirectUri, stateData }) {
    const codeVerifier = stateData?.code_verifier;
    if (!codeVerifier) throw new Error('missing_code_verifier');
    const tokenUrl = process.env[envKey(provider, 'TOKEN_URL')];
    const clientId = process.env[envKey(provider, 'CLIENT_ID')];
    const clientSecret = process.env[envKey(provider, 'CLIENT_SECRET')];
    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error('missing_oauth_config');
    }

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
      }),
    });
    if (!resp.ok) {
      throw new Error(`token_exchange_error:${resp.status}`);
    }
    return resp.json();
  },
};

const adapters: Record<string, OAuthAdapter> = {
  shopify: shopifyAdapter,
  x: pkceAdapter,
  coinbase: defaultAdapter,
  binance: defaultAdapter,
  kalshi: defaultAdapter,
  polymarket: defaultAdapter,
  alpaca: defaultAdapter,
  amazon: defaultAdapter,
  etsy: defaultAdapter,
  square: defaultAdapter,
  woocommerce: defaultAdapter,
  ebay: defaultAdapter,
  tiktok: defaultAdapter,
  instagram: defaultAdapter,
  facebook: defaultAdapter,
  linkedin: defaultAdapter,
};

export function getAdapter(provider: string): OAuthAdapter {
  return adapters[provider] ?? defaultAdapter;
}
