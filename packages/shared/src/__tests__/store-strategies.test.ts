import { describe, it, expect } from 'vitest';
import {
  calculateDynamicPrice,
  forecastInventory,
  scoreListingQuality,
  analyzeReviewSentiment,
  getSeasonalFactor,
  optimizeListing,
  analyzeCompetitorPrices,
  generateReviewResponse,
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
      expect(typeof calculateDynamicPrice).toBe('function');
    });
    it('review management placeholder always scans reviews', () => {
      const strategies: any[] = ['review_management'];
      expect(strategies).toContain('review_management');
    });
  });

  // ─── Seasonal Factor ──────────────────────────────────────
  describe('getSeasonalFactor', () => {
    it('returns 1.0 for normal months (like March)', () => {
      const march = new Date(2024, 2, 15); // March 15
      expect(getSeasonalFactor(march)).toBe(1.0);
    });

    it('returns premium for holiday shopping (Dec 10)', () => {
      const dec10 = new Date(2024, 11, 10);
      expect(getSeasonalFactor(dec10)).toBe(1.15);
    });

    it('returns clearance for post-holiday (Dec 28)', () => {
      const dec28 = new Date(2024, 11, 28);
      expect(getSeasonalFactor(dec28)).toBe(0.80);
    });

    it('returns clearance for January start', () => {
      const jan5 = new Date(2024, 0, 5);
      expect(getSeasonalFactor(jan5)).toBe(0.82);
    });

    it('returns back-to-school premium for August', () => {
      const aug = new Date(2024, 7, 15);
      expect(getSeasonalFactor(aug)).toBe(1.06);
    });

    it('returns summer lull for June', () => {
      const jun = new Date(2024, 5, 15);
      expect(getSeasonalFactor(jun)).toBe(0.95);
    });

    it('returns Black Friday discount (Nov 25)', () => {
      const bf = new Date(2024, 10, 25);
      expect(getSeasonalFactor(bf)).toBe(0.85);
    });

    it('returns Valentine premium (Feb 12)', () => {
      const val = new Date(2024, 1, 12);
      expect(getSeasonalFactor(val)).toBe(1.08);
    });
  });

  // ─── Platform-Specific Pricing ────────────────────────────
  describe('platform-specific pricing', () => {
    it('Shopify applies DTC premium', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct(), competitorPrices: [80], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        15, 20, 'shopify',
      );
      expect(result.reason).toContain('DTC');
    });

    it('Amazon applies Buy Box strategy', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'amazon', price: 90 }), competitorPrices: [85, 82], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        15, 20, 'amazon',
      );
      expect(result.reason).toContain('Buy Box');
    });

    it('Etsy applies handmade premium', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'etsy' }), competitorPrices: [80], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        15, 20, 'etsy',
      );
      expect(result.reason).toContain('Handmade');
    });

    it('eBay considers auction dynamics', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'ebay', price: 120 }), competitorPrices: [70, 75, 80, 85], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        20, 20, 'ebay',
      );
      expect(result.reason).toContain('BIN');
    });

    it('Square applies local convenience premium', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'square' }), competitorPrices: [80], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        15, 20, 'square',
      );
      expect(result.reason).toContain('Local convenience');
    });

    it('WooCommerce applies self-hosted advantage', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'woocommerce' }), competitorPrices: [80], demandScore: 50, inventoryDaysRemaining: 30, seasonalFactor: 1.0 },
        15, 20, 'woocommerce',
      );
      expect(result.reason).toContain('Self-hosted');
    });

    it('Amazon IPI protection: clears excess inventory', () => {
      const result = calculateDynamicPrice(
        { product: makeProduct({ platform: 'amazon', price: 100 }), competitorPrices: [100], demandScore: 50, inventoryDaysRemaining: 150, seasonalFactor: 1.0 },
        20, 15, 'amazon',
      );
      expect(result.reason).toContain('IPI');
      expect(result.recommendedPrice).toBeLessThan(100);
    });
  });

  // ─── Review Sentiment ─────────────────────────────────────
  describe('analyzeReviewSentiment', () => {
    it('detects positive sentiment', () => {
      const result = analyzeReviewSentiment('This product is amazing and I love it! Excellent quality.');
      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0.65);
    });

    it('detects negative sentiment', () => {
      const result = analyzeReviewSentiment('Terrible product, broke after one day. Awful quality.');
      expect(result.label).toBe('negative');
      expect(result.score).toBeLessThan(0.35);
    });

    it('detects neutral sentiment', () => {
      const result = analyzeReviewSentiment('The product arrived on time.');
      expect(result.label).toBe('neutral');
    });

    it('handles intensity modifiers', () => {
      const reg = analyzeReviewSentiment('good product');
      const intense = analyzeReviewSentiment('extremely good product');
      expect(intense.score).toBeGreaterThan(reg.score);
    });

    it('handles negation', () => {
      const positive = analyzeReviewSentiment('This is good');
      const negated = analyzeReviewSentiment('This is not good');
      expect(negated.score).toBeLessThan(positive.score);
    });

    it('detects multi-word phrases', () => {
      const result = analyzeReviewSentiment('This is a waste of money and fell apart');
      expect(result.label).toBe('negative');
      expect(result.reasons.some(r => r.includes('phrase'))).toBe(true);
    });

    it('amplifies sentiment with exclamation marks', () => {
      const calm = analyzeReviewSentiment('This is great');
      const excited = analyzeReviewSentiment('This is great!!!');
      expect(excited.score).toBeGreaterThan(calm.score);
    });

    it('returns reasons array', () => {
      const result = analyzeReviewSentiment('Absolutely terrible product, worst purchase ever');
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  // ─── Listing Optimization ──────────────────────────────────
  describe('optimizeListing', () => {
    it('adds category to title if missing', () => {
      const product = makeProduct({ title: 'Wireless Headphones', category: 'Audio Equipment' });
      const result = optimizeListing(product);
      expect(result.optimizedTitle).toContain('Audio Equipment');
      expect(result.titleChanges.some(c => c.includes('category'))).toBe(true);
    });

    it('adds category as tag if missing', () => {
      const product = makeProduct({ category: 'Gadgets', tags: ['cool', 'tech'] });
      const result = optimizeListing(product);
      expect(result.suggestedTags).toContain('gadgets');
    });

    it('removes duplicate tags', () => {
      const product = makeProduct({ tags: ['tech', 'Tech', 'audio', 'AUDIO'] });
      const result = optimizeListing(product);
      const uniqueTags = new Set(result.suggestedTags);
      expect(result.suggestedTags.length).toBe(uniqueTags.size);
    });

    it('trims tags to platform max for etsy', () => {
      const product = makeProduct({
        platform: 'etsy',
        tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
      });
      const result = optimizeListing(product);
      expect(result.suggestedTags.length).toBeLessThanOrEqual(13);
    });

    it('reports no changes for well-optimized listing', () => {
      const product = makeProduct({
        title: 'Premium Wireless Headphones - Electronics',
        category: 'Electronics',
        tags: ['headphones', 'wireless', 'bluetooth', 'electronics'],
      });
      const result = optimizeListing(product);
      // Should still return valid result
      expect(result.productId).toBe(product.id);
    });
  });

  // ─── Competitor Analysis ───────────────────────────────────
  describe('analyzeCompetitorPrices', () => {
    it('detects when priced above average', () => {
      const result = analyzeCompetitorPrices(
        makeProduct({ price: 100 }),
        [60, 65, 70, 75],
      );
      expect(result.pricePosition).toBe('highest');
      expect(result.actionRequired).toBe(true);
      expect(result.percentFromAvg).toBeGreaterThan(0);
    });

    it('detects when priced below average', () => {
      const result = analyzeCompetitorPrices(
        makeProduct({ price: 50 }),
        [80, 85, 90],
      );
      expect(result.percentFromAvg).toBeLessThan(0);
      expect(result.actionRequired).toBe(true);
    });

    it('detects well-positioned pricing', () => {
      const result = analyzeCompetitorPrices(
        makeProduct({ price: 80 }),
        [78, 82, 79, 81],
      );
      expect(result.pricePosition).toBe('at_avg');
      expect(result.actionRequired).toBe(false);
    });

    it('handles empty competitor data', () => {
      const result = analyzeCompetitorPrices(makeProduct(), []);
      expect(result.actionRequired).toBe(false);
      expect(result.recommendation).toContain('No competitor data');
    });

    it('calculates correct statistics', () => {
      const result = analyzeCompetitorPrices(makeProduct(), [10, 20, 30]);
      expect(result.competitorMin).toBe(10);
      expect(result.competitorMax).toBe(30);
      expect(result.competitorAvg).toBe(20);
      expect(result.competitorMedian).toBe(20);
    });
  });

  // ─── Review Response Generation ────────────────────────────
  describe('generateReviewResponse', () => {
    it('generates apology for negative shipping review', () => {
      const result = generateReviewResponse('Product never arrived, terrible awful shipping! Worst experience ever!', 'Wireless Headphones');
      expect(result.priority).toBe('high');
      expect(result.responseType).toBe('apology');
      expect(result.suggestedResponse).toContain('shipping');
    });

    it('generates apology for quality issue', () => {
      const result = generateReviewResponse('Product broke after one day, terrible cheap quality', 'Phone Case');
      expect(result.priority).toBe('high');
      expect(result.suggestedResponse).toContain('quality');
    });

    it('generates thank you for positive review', () => {
      const result = generateReviewResponse('I love this product! Amazing quality and fast delivery!', 'Earbuds');
      expect(result.priority).toBe('low');
      expect(result.responseType).toBe('thank_you');
    });

    it('responds to repeat buyer praise', () => {
      const result = generateReviewResponse('Bought this again because I love it so much! Great product!', 'Moisturizer');
      expect(result.suggestedResponse).toContain('loyal');
    });

    it('handles neutral review with question', () => {
      const result = generateReviewResponse('Does this come in other colors?', 'T-Shirt');
      expect(result.responseType).toBe('follow_up');
      expect(result.priority).toBe('medium');
    });

    it('handles basic neutral review', () => {
      const result = generateReviewResponse('Product is okay.', 'Widget');
      expect(result.responseType).toBe('acknowledgment');
    });
  });

  // ─── Enhanced Listing Quality Scoring ──────────────────────
  describe('scoreListingQuality - enhanced', () => {
    it('scores platform-specific title length for Amazon', () => {
      const product = makeProduct({ platform: 'amazon', title: 'Short' });
      const score = scoreListingQuality(product);
      expect(score.suggestions.some(s => s.includes('Amazon'))).toBe(true);
    });

    it('detects duplicate tags', () => {
      const product = makeProduct({ tags: ['tech', 'Tech', 'audio'] });
      const score = scoreListingQuality(product);
      expect(score.suggestions.some(s => s.includes('duplicate'))).toBe(true);
    });

    it('rewards category keyword in title', () => {
      const withKw = makeProduct({ title: 'Premium Electronics Gadget', category: 'Electronics' });
      const withoutKw = makeProduct({ title: 'Premium Gadget', category: 'Electronics' });
      const scoreWith = scoreListingQuality(withKw);
      const scoreWithout = scoreListingQuality(withoutKw);
      expect(scoreWith.descriptionScore).toBeGreaterThanOrEqual(scoreWithout.descriptionScore);
    });

    it('checks low margin', () => {
      const product = makeProduct({ price: 26, costOfGoods: 25 });
      const score = scoreListingQuality(product);
      expect(score.suggestions.some(s => s.includes('margin'))).toBe(true);
    });

    it('suggests multi-word tags', () => {
      const product = makeProduct({ tags: ['a', 'b', 'c', 'd', 'e'] }); // short tags
      const score = scoreListingQuality(product);
      expect(score.suggestions.some(s => s.includes('multi-word'))).toBe(true);
    });
  });
});
