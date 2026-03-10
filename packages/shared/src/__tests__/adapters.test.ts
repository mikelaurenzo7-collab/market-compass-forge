import {
  createTradingAdapter,
  createStoreAdapter,
  createSocialAdapter,
} from '../index';

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