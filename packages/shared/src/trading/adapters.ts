/**
 * Real exchange adapter implementations for all supported trading platforms.
 * Each adapter implements TradingAdapter and wraps the platform's REST API.
 * Credentials are injected at construction — no hardcoded keys.
 */

import type { TradingPlatform, MarketData, TradeSignal, Position } from '../index';
import type { TradingAdapter } from './engine';
import crypto from 'crypto';

// ─── Signing helpers ─────────────────────────────────────────

export function coinbaseSign(secret: string, timestamp: string, method: string, requestPath: string, body: string): string {
  const prehash = timestamp + method.toUpperCase() + requestPath + body;
  return crypto.createHmac('sha256', secret).update(prehash).digest('hex');
}

export function binanceSign(secret: string, queryString: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

export function alpacaSign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ─── Shared HTTP helper with retry + rate-limit awareness ─────

interface AdapterCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  sandbox?: boolean;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.ok) return res.json() as Promise<T>;

      // Rate-limited: respect Retry-After header
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter
          ? (Number(retryAfter) > 0 ? Number(retryAfter) * 1000 : 1000)
          : 1000 * 2 ** attempt;
        if (attempt < MAX_RETRIES) {
          await sleep(Math.min(waitMs, 30_000));
          continue;
        }
      }

      // Retryable server errors: exponential backoff
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        await sleep(50 * 2 ** attempt); // 50ms → 100ms → 200ms
        continue;
      }

      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Network errors (ECONNRESET, timeout) are retryable
      if (attempt < MAX_RETRIES && !lastError.message.startsWith('API ')) {
        await sleep(50 * 2 ** attempt);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('jsonFetch: exhausted retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Coinbase Advanced Trade Adapter ──────────────────────────

export class CoinbaseAdapter implements TradingAdapter {
  readonly platform: TradingPlatform = 'coinbase';
  private baseUrl: string;
  private creds: AdapterCredentials;

  constructor(creds: AdapterCredentials) {
    this.creds = creds;
    this.baseUrl = creds.sandbox
      ? 'https://api-sandbox.coinbase.com'
      : 'https://api.coinbase.com';
  }

  private headers(method: string, requestPath: string, body: string = ''): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = coinbaseSign(this.creds.apiSecret, timestamp, method, requestPath, body);
    return {
      'Content-Type': 'application/json',
      'CB-ACCESS-KEY': this.creds.apiKey,
      'CB-ACCESS-SIGN': sign,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-VERSION': '2024-01-01',
    };
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const productId = symbol.replace('/', '-'); // BTC-USD
    const tickerPath = `/api/v3/brokerage/products/${productId}/ticker`;
    const statsPath = `/api/v3/brokerage/products/${productId}`;
    const [ticker, stats] = await Promise.all([
      jsonFetch<any>(`${this.baseUrl}${tickerPath}`, {
        headers: this.headers('GET', tickerPath),
      }),
      jsonFetch<any>(`${this.baseUrl}${statsPath}`, {
        headers: this.headers('GET', statsPath),
      }),
    ]);

    const price = parseFloat(ticker.trades?.[0]?.price ?? stats.price ?? '0');
    const bid = parseFloat(ticker.best_bid ?? String(price * 0.999));
    const ask = parseFloat(ticker.best_ask ?? String(price * 1.001));

    return {
      symbol,
      price,
      volume24h: parseFloat(stats.volume_24h ?? '0'),
      high24h: parseFloat(stats.high_24h ?? String(price)),
      low24h: parseFloat(stats.low_24h ?? String(price)),
      change24hPercent: parseFloat(stats.price_percentage_change_24h ?? '0'),
      bid,
      ask,
      timestamp: Date.now(),
    };
  }

  async placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> {
    const body = {
      client_order_id: `bb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_id: signal.symbol,
      side: signal.side.toUpperCase(),
      order_configuration: {
        market_market_ioc: {
          quote_size: String((signal.quantity * (signal.price ?? 0)).toFixed(2)),
        },
      },
    };

    const bodyStr = JSON.stringify(body);
    const result = await jsonFetch<any>(`${this.baseUrl}/api/v3/brokerage/orders`, {
      method: 'POST',
      headers: this.headers('POST', '/api/v3/brokerage/orders', bodyStr),
      body: bodyStr,
    });

    return {
      orderId: result.success_response?.order_id ?? result.order_id ?? 'unknown',
      filled: result.success_response?.status === 'FILLED',
    };
  }

  async getPositions(): Promise<Position[]> {
    const path = '/api/v3/brokerage/accounts';
    const resp = await jsonFetch<any>(`${this.baseUrl}${path}`, {
      headers: this.headers('GET', path),
    });

    const positions: Position[] = [];
    for (const a of resp.accounts ?? []) {
      if (parseFloat(a.available_balance?.value ?? '0') <= 0) continue;
      if (a.currency === 'USD') continue;
      const symbol = `${a.currency}-USD`;
      // attempt to get market price for the symbol
      let entry = 0;
      let curr = 0;
      try {
        const data = await this.fetchMarketData(symbol);
        curr = data.price;
        entry = data.price; // assume flat entry; better tracking requires order history
      } catch (e) {
        // ignore
      }
      const qty = parseFloat(a.available_balance?.value ?? '0');
      positions.push({
        platform: 'coinbase' as TradingPlatform,
        symbol,
        side: 'buy',
        entryPrice: entry,
        currentPrice: curr,
        quantity: qty,
        unrealizedPnl: (curr - entry) * qty,
        openedAt: Date.now(),
      });
    }
    return positions;
  }

  async getBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
    const path = '/api/v3/brokerage/accounts';
    const resp = await jsonFetch<any>(`${this.baseUrl}${path}`, {
      headers: this.headers('GET', path),
    });
    const usdAccount = (resp.accounts ?? []).find((a: any) => a.currency === 'USD');
    const available = parseFloat(usdAccount?.available_balance?.value ?? '0');
    const hold = parseFloat(usdAccount?.hold?.value ?? '0');
    return { availableUsd: available, totalUsd: available + hold };
  }
}

// ─── Binance Adapter ──────────────────────────────────────────

export class BinanceAdapter implements TradingAdapter {
  readonly platform: TradingPlatform = 'binance';
  private baseUrl: string;
  private creds: AdapterCredentials;

  constructor(creds: AdapterCredentials) {
    this.creds = creds;
    this.baseUrl = creds.sandbox
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-MBX-APIKEY': this.creds.apiKey,
    };
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const cleanSymbol = symbol.replace('-', '').replace('/', '');
    const [ticker, stats] = await Promise.all([
      jsonFetch<any>(`${this.baseUrl}/api/v3/ticker/price?symbol=${cleanSymbol}`),
      jsonFetch<any>(`${this.baseUrl}/api/v3/ticker/24hr?symbol=${cleanSymbol}`),
    ]);

    const price = parseFloat(ticker.price ?? '0');
    return {
      symbol,
      price,
      volume24h: parseFloat(stats.volume ?? '0'),
      high24h: parseFloat(stats.highPrice ?? String(price)),
      low24h: parseFloat(stats.lowPrice ?? String(price)),
      change24hPercent: parseFloat(stats.priceChangePercent ?? '0'),
      bid: parseFloat(stats.bidPrice ?? String(price * 0.999)),
      ask: parseFloat(stats.askPrice ?? String(price * 1.001)),
      timestamp: Date.now(),
    };
  }

  async placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> {
    const params = new URLSearchParams({
      symbol: signal.symbol.replace('-', '').replace('/', ''),
      side: signal.side.toUpperCase(),
      type: 'MARKET',
      quantity: signal.quantity.toFixed(8),
      timestamp: String(Date.now()),
    });
    const query = params.toString();
    const signature = binanceSign(this.creds.apiSecret, query);
    const result = await jsonFetch<any>(`${this.baseUrl}/api/v3/order?${query}&signature=${signature}`, {
      method: 'POST',
      headers: this.headers(),
    });

    return {
      orderId: String(result.orderId ?? 'unknown'),
      filled: result.status === 'FILLED',
    };
  }

  async getPositions(): Promise<Position[]> {
    const params = new URLSearchParams({ timestamp: String(Date.now()) });
    const queryStr = params.toString();
    const signature = binanceSign(this.creds.apiSecret, queryStr);
    const resp = await jsonFetch<any>(`${this.baseUrl}/api/v3/account?${queryStr}&signature=${signature}`, {
      headers: this.headers(),
    });

    const positions: Position[] = [];
    for (const b of resp.balances ?? []) {
      if (parseFloat(b.free) <= 0) continue;
      if (b.asset === 'USDT' || b.asset === 'USD') continue;
      const symbol = `${b.asset}USDT`;
      let entry = 0;
      let curr = 0;
      try {
        const data = await this.fetchMarketData(symbol);
        curr = data.price;
        entry = data.price;
      } catch (e) {
        // ignore
      }
      const qty = parseFloat(b.free);
      positions.push({
        platform: 'binance' as TradingPlatform,
        symbol,
        side: 'buy',
        entryPrice: entry,
        currentPrice: curr,
        quantity: qty,
        unrealizedPnl: (curr - entry) * qty,
        openedAt: Date.now(),
      });
    }
    return positions;
  }

  async getBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
    const params = new URLSearchParams({ timestamp: String(Date.now()) });
    const queryStr = params.toString();
    const signature = binanceSign(this.creds.apiSecret, queryStr);
    const resp = await jsonFetch<any>(`${this.baseUrl}/api/v3/account?${queryStr}&signature=${signature}`, {
      headers: this.headers(),
    });
    const usdt = (resp.balances ?? []).find((b: any) => b.asset === 'USDT');
    const free = parseFloat(usdt?.free ?? '0');
    const locked = parseFloat(usdt?.locked ?? '0');
    return { availableUsd: free, totalUsd: free + locked };
  }
}

// ─── Alpaca Adapter ───────────────────────────────────────────

export class AlpacaAdapter implements TradingAdapter {
  readonly platform: TradingPlatform = 'alpaca';
  private baseUrl: string;
  private dataUrl: string;
  private creds: AdapterCredentials;

  constructor(creds: AdapterCredentials) {
    this.creds = creds;
    this.baseUrl = creds.sandbox
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
    this.dataUrl = 'https://data.alpaca.markets';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': this.creds.apiKey,
      'APCA-API-SECRET-KEY': this.creds.apiSecret,
    };
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const [snapshot, quote] = await Promise.all([
      jsonFetch<any>(`${this.dataUrl}/v2/stocks/${symbol}/snapshot`, {
        headers: this.headers(),
      }),
      jsonFetch<any>(`${this.dataUrl}/v2/stocks/${symbol}/quotes/latest`, {
        headers: this.headers(),
      }),
    ]);

    const bar = snapshot.dailyBar ?? snapshot.latestTrade ?? {};
    const trade = snapshot.latestTrade ?? {};
    const price = trade.p ?? bar.c ?? 0;

    return {
      symbol,
      price,
      volume24h: bar.v ?? 0,
      high24h: bar.h ?? price,
      low24h: bar.l ?? price,
      change24hPercent: bar.c && snapshot.prevDailyBar?.c
        ? ((bar.c - snapshot.prevDailyBar.c) / snapshot.prevDailyBar.c) * 100
        : 0,
      bid: quote.quote?.bp ?? price * 0.999,
      ask: quote.quote?.ap ?? price * 1.001,
      timestamp: Date.now(),
    };
  }

  async placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> {
    const body = {
      symbol: signal.symbol,
      qty: String(signal.quantity),
      side: signal.side,
      type: 'market',
      time_in_force: 'day',
    };

    const bodyStr = JSON.stringify(body);
    const sig = alpacaSign(this.creds.apiSecret, bodyStr);
    const result = await jsonFetch<any>(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      headers: { ...this.headers(), 'APCA-API-SIGNATURE': sig },
      body: bodyStr,
    });

    return {
      orderId: result.id ?? 'unknown',
      filled: result.status === 'filled',
    };
  }

  async getPositions(): Promise<Position[]> {
    const resp = await jsonFetch<any[]>(`${this.baseUrl}/v2/positions`, {
      headers: this.headers(),
    });

    return resp.map((p: any) => ({
      platform: 'alpaca' as TradingPlatform,
      symbol: p.symbol,
      side: p.side === 'long' ? ('buy' as const) : ('sell' as const),
      entryPrice: parseFloat(p.avg_entry_price ?? '0'),
      currentPrice: parseFloat(p.current_price ?? '0'),
      quantity: parseFloat(p.qty ?? '0'),
      unrealizedPnl: parseFloat(p.unrealized_pl ?? '0'),
      openedAt: Date.now(),
    }));
  }

  async getBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/v2/account`, {
      headers: this.headers(),
    });
    return {
      availableUsd: parseFloat(resp.buying_power ?? '0') / (parseFloat(resp.multiplier ?? '1') || 1),
      totalUsd: parseFloat(resp.equity ?? '0'),
    };
  }
}

// ─── Kalshi Adapter ───────────────────────────────────────────

export class KalshiAdapter implements TradingAdapter {
  readonly platform: TradingPlatform = 'kalshi';
  private baseUrl: string;
  private creds: AdapterCredentials;

  constructor(creds: AdapterCredentials) {
    this.creds = creds;
    this.baseUrl = creds.sandbox
      ? 'https://demo-api.kalshi.co'
      : 'https://trading-api.kalshi.com';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.apiKey}`,
    };
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/trade-api/v2/markets/${symbol}`, {
      headers: this.headers(),
    });
    const market = resp.market ?? resp;
    const yesPrice = (market.yes_ask ?? 50) / 100;
    const noPrice = (market.no_ask ?? 50) / 100;

    return {
      symbol,
      price: yesPrice,
      volume24h: market.volume ?? 0,
      high24h: yesPrice,
      low24h: yesPrice,
      change24hPercent: 0,
      bid: (market.yes_bid ?? yesPrice * 100 - 1) / 100,
      ask: (market.yes_ask ?? yesPrice * 100 + 1) / 100,
      timestamp: Date.now(),
    };
  }

  async placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> {
    const body = {
      ticker: signal.symbol,
      action: signal.side === 'buy' ? 'buy' : 'sell',
      side: 'yes',
      type: 'market',
      count: Math.max(1, Math.round(signal.quantity)),
    };

    const result = await jsonFetch<any>(`${this.baseUrl}/trade-api/v2/portfolio/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    return {
      orderId: result.order?.order_id ?? 'unknown',
      filled: result.order?.status === 'executed',
    };
  }

  async getPositions(): Promise<Position[]> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/trade-api/v2/portfolio/positions`, {
      headers: this.headers(),
    });

    return (resp.market_positions ?? []).map((p: any) => ({
      platform: 'kalshi' as TradingPlatform,
      symbol: p.ticker ?? p.market_ticker,
      side: 'buy' as const,
      entryPrice: (p.average_price_paid ?? 0) / 100,
      currentPrice: (p.market_price ?? 0) / 100,
      quantity: p.position ?? 0,
      unrealizedPnl: ((p.market_price ?? 0) - (p.average_price_paid ?? 0)) * (p.position ?? 0) / 100,
      openedAt: Date.now(),
    }));
  }

  async getBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/trade-api/v2/portfolio/balance`, {
      headers: this.headers(),
    });
    return {
      availableUsd: (resp.balance ?? 0) / 100,
      totalUsd: ((resp.balance ?? 0) + (resp.payout ?? 0)) / 100,
    };
  }
}

// ─── Polymarket Adapter ───────────────────────────────────────

export class PolymarketAdapter implements TradingAdapter {
  readonly platform: TradingPlatform = 'polymarket';
  private creds: AdapterCredentials;

  constructor(creds: AdapterCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.apiKey}`,
    };
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resp = await jsonFetch<any>(`https://clob.polymarket.com/markets/${symbol}`, {
      headers: this.headers(),
    });

    const price = parseFloat(resp.tokens?.[0]?.price ?? '0.5');
    return {
      symbol,
      price,
      volume24h: parseFloat(resp.volume_num_24hr ?? '0'),
      high24h: price,
      low24h: price,
      change24hPercent: 0,
      bid: price - 0.01,
      ask: price + 0.01,
      timestamp: Date.now(),
    };
  }

  async placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> {
    // Polymarket uses CLOB — simplified order placement
    const body = {
      tokenID: signal.symbol,
      side: signal.side === 'buy' ? 'BUY' : 'SELL',
      price: String(signal.price ?? 0.5),
      size: String(signal.quantity),
      orderType: 'GTC',
    };

    const result = await jsonFetch<any>('https://clob.polymarket.com/order', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    return {
      orderId: result.orderID ?? result.id ?? 'unknown',
      filled: result.status === 'MATCHED',
    };
  }

  async getPositions(): Promise<Position[]> {
    const resp = await jsonFetch<any>('https://clob.polymarket.com/positions', {
      headers: this.headers(),
    });

    return (resp.positions ?? []).map((p: any) => ({
      platform: 'polymarket' as TradingPlatform,
      symbol: p.asset?.token_id ?? p.market ?? 'unknown',
      side: 'buy' as const,
      entryPrice: parseFloat(p.avg_price_paid ?? '0'),
      currentPrice: parseFloat(p.cur_price ?? p.avg_price_paid ?? '0'),
      quantity: parseFloat(p.size ?? '0'),
      unrealizedPnl:
        (parseFloat(p.cur_price ?? '0') - parseFloat(p.avg_price_paid ?? '0')) *
        parseFloat(p.size ?? '0'),
      openedAt: Date.now(),
    }));
  }

  async getBalance(): Promise<{ availableUsd: number; totalUsd: number }> {
    const resp = await jsonFetch<any>('https://clob.polymarket.com/balance', {
      headers: this.headers(),
    });

    const available = parseFloat(resp.available_balance ?? resp.balance ?? '0');
    const total = parseFloat(resp.total_balance ?? resp.balance ?? '0');
    return { availableUsd: available, totalUsd: total };
  }
}

// ─── Adapter Factory ──────────────────────────────────────────

export function createTradingAdapter(
  platform: TradingPlatform,
  creds: AdapterCredentials
): TradingAdapter {
  switch (platform) {
    case 'coinbase': return new CoinbaseAdapter(creds);
    case 'binance': return new BinanceAdapter(creds);
    case 'alpaca': return new AlpacaAdapter(creds);
    case 'kalshi': return new KalshiAdapter(creds);
    case 'polymarket': return new PolymarketAdapter(creds);
    default:
      throw new Error(`Unsupported trading platform: ${platform}`);
  }
}
