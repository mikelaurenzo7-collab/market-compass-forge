import {
  createTradingAdapter,
  createStoreAdapter,
  createSocialAdapter,
} from '../index';
import { binanceSign } from '../trading/adapters';

describe('adapter factories', () => {
  const dummyCreds = { apiKey: 'key', apiSecret: 'secret', sandbox: true };
  it('can create each trading adapter without throwing', () => {
    ['coinbase', 'binance', 'alpaca', 'kalshi', 'polymarket'].forEach((plat) => {
      const adapter: any = createTradingAdapter(plat as any, dummyCreds);
      expect(adapter.platform).toBe(plat);
      expect(adapter.fetchMarketData).toBeInstanceOf(Function);
      expect(adapter.placeOrder).toBeInstanceOf(Function);
    });
  });

  it('coinbase adapter signs requests', () => {
    const adapter: any = createTradingAdapter('coinbase', dummyCreds);
    const headers = adapter.headers('GET','/foo');
    expect(headers['CB-ACCESS-SIGN']).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(headers['CB-ACCESS-TIMESTAMP']).toBeDefined();
  });

  it('binance adapter includes signature', () => {
    const adapter: any = createTradingAdapter('binance', dummyCreds);
    const params = new URLSearchParams({ symbol: 'BTCUSDT', timestamp: '123' });
    const sig = binanceSign(dummyCreds.apiSecret, params.toString());
    expect(sig).toMatch(/^[0-9a-fA-F]{64}$/);
  });

  it('can create each store adapter without throwing', () => {
    ['shopify','square','amazon','etsy','ebay','woocommerce'].forEach((plat) => {
      const adapter: any = createStoreAdapter(plat as any, dummyCreds);
      expect(adapter.platform).toBe(plat);
      expect(adapter.fetchProducts).toBeInstanceOf(Function);
      expect(adapter.updatePrice).toBeInstanceOf(Function);
    });
  });

  it('can create each social adapter without throwing', () => {
    ['x','tiktok','instagram','facebook','linkedin'].forEach((plat) => {
      const adapter: any = createSocialAdapter(plat as any, dummyCreds);
      expect(adapter.platform).toBe(plat);
      expect(adapter.publishPost).toBeInstanceOf(Function);
      expect(adapter.getMetrics).toBeInstanceOf(Function);
    });
  });
});