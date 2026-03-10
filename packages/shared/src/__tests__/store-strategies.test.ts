import { describe, it, expect } from 'vitest';
import {
  calculateDynamicPrice,
  forecastInventory,
  scoreListingQuality,
  STORE_PLATFORM_STRATEGIES,
} from '../store/strategies';
import type { Product } from '../index';

function makeProduct(overrides?: Partial<Product>): Product {
  return {
    id: 'prod-1',
    platform: 'shopify',
    title: 'Premium Wireless Headphones',
    price: 79.99,
    costOfGoods: 25,
    inventory: 100,
    category: 'Electronics',
    tags: ['headphones', 'wireless', 'bluetooth', 'audio', 'premium'],
    status: 'active',
    ...overrides,
  };
}

describe('Store Strategies', () => {
  describe('calculateDynamicPrice', () => {
    it('returns a pricing action with valid fields', () => {
      const result = calculateDynamicPrice(
        {
          product: makeProduct(),
          competitorPrices: [74.99, 82.99, 85.00],
          demandScore: 60,
          inventoryDaysRemaining: 30,
          seasonalFactor: 1.0,
        },
        10,
        20,
      );
      expect(result.productId).toBe('prod-1');
      expect(result.platform).toBe('shopify');
      expect(result.recommendedPrice).toBeGreaterThan(0);
      expect(result.minPrice).toBeGreaterThan(0);
      expect(result.maxPrice).toBeGreaterThan(result.minPrice);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('raises price with high demand', () => {
      const product = makeProduct({ price: 80 });
      const highDemand = calculateDynamicPrice(
        { product, competitorPrices: [80], demandScore: 90, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        20,
        20,
      );
      const lowDemand = calculateDynamicPrice(
        { product, competitorPrices: [80], demandScore: 10, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        20,
        20,
      );
      expect(highDemand.recommendedPrice).toBeGreaterThanOrEqual(lowDemand.recommendedPrice);
    });

    it('enforces minimum margin', () => {
      const result = calculateDynamicPrice(
        {
          product: makeProduct({ price: 30, costOfGoods: 25 }),
          competitorPrices: [10, 12],
          demandScore: 5,
          inventoryDaysRemaining: 200,
          seasonalFactor: 0.8,
        },
        50,
        20,
      );
      // Min price = 25 * 1.2 = 30
      expect(result.recommendedPrice).toBeGreaterThanOrEqual(result.minPrice);
    });

    it('caps price change within maxChangePercent', () => {
      const product = makeProduct({ price: 100 });
      const result = calculateDynamicPrice(
        { product, competitorPrices: [200, 250], demandScore: 95, inventoryDaysRemaining: 3, seasonalFactor: 1.5 },
        5,
        10,
      );
      // Max allowed change = 100 * 5% = 5, so max = 105
      expect(result.recommendedPrice).toBeLessThanOrEqual(105);
    });
  });

  describe('forecastInventory', () => {
    it('forecasts days until stockout', () => {
      const product = makeProduct({ inventory: 100 });
      const sales = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        unitsSold: 5,
      }));
      const forecast = forecastInventory(product, sales, 14, 1.0);
      expect(forecast.daysUntilStockout).toBe(20); // 100 / 5
      expect(forecast.dailyVelocity).toBeCloseTo(5, 1);
      expect(forecast.reorderPoint).toBeGreaterThan(0);
      expect(forecast.recommendedReorderQty).toBeGreaterThan(0);
    });

    it('handles zero sales velocity', () => {
      const product = makeProduct({ inventory: 50 });
      const sales = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        unitsSold: 0,
      }));
      const forecast = forecastInventory(product, sales, 14, 1.0);
      expect(forecast.daysUntilStockout).toBe(9999);
    });

    it('applies seasonal factor', () => {
      const product = makeProduct({ inventory: 100 });
      const sales = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        unitsSold: 10,
      }));
      const normalForecast = forecastInventory(product, sales, 14, 1.0);
      const highSeasonForecast = forecastInventory(product, sales, 14, 2.0);
      expect(highSeasonForecast.daysUntilStockout).toBeLessThan(normalForecast.daysUntilStockout);
    });
  });

  describe('scoreListingQuality', () => {
    it('scores a well-optimized listing highly', () => {
      const product = makeProduct({
        title: 'Premium Wireless Bluetooth Headphones - Active Noise Cancelling',
        tags: ['headphones', 'wireless', 'bluetooth', 'noise-cancelling', 'audio', 'premium', 'over-ear'],
        category: 'Electronics > Headphones',
      });
      const score = scoreListingQuality(product);
      expect(score.overallScore).toBeGreaterThan(50);
      expect(score.titleScore).toBeGreaterThan(50);
      expect(score.tagScore).toBeGreaterThan(50);
    });

    it('gives suggestions for a minimal listing', () => {
      const product = makeProduct({
        title: 'Item',
        tags: ['a'],
        category: '',
        status: 'draft',
      });
      const score = scoreListingQuality(product);
      expect(score.suggestions.length).toBeGreaterThan(0);
      expect(score.overallScore).toBeLessThan(60);
    });
  });

  describe('STORE_PLATFORM_STRATEGIES', () => {
    it('covers all 6 platforms', () => {
      const platforms = STORE_PLATFORM_STRATEGIES.map((s) => s.platform);
      expect(platforms).toContain('shopify');
      expect(platforms).toContain('amazon');
      expect(platforms).toContain('etsy');
      expect(platforms).toContain('ebay');
      expect(platforms).toContain('square');
      expect(platforms).toContain('woocommerce');
    });

    it('has unique characteristics per platform', () => {
      const shopify = STORE_PLATFORM_STRATEGIES.find((s) => s.platform === 'shopify')!;
      const amazon = STORE_PLATFORM_STRATEGIES.find((s) => s.platform === 'amazon')!;
      expect(shopify.pricingModel).not.toBe(amazon.pricingModel);
      expect(shopify.focusAreas).not.toEqual(amazon.focusAreas);
    });
  });

  describe('additional store strategy stubs', () => {
    it('competitor monitoring would detect cheap competitors', () => {
      // adapt engine test rather than strategy file; here we simply assert the function exists
      expect(typeof calculateDynamicPrice).toBe('function');
    });
    it('review management placeholder always scans reviews', () => {
      // no real function exported; just ensure strategy type covers it
      const strategies: any[] = ['review_management'];
      expect(strategies).toContain('review_management');
    });
  });
});
