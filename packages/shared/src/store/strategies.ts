import type { Product, PricingAction, InventoryForecast, StorePlatform } from '../index.js';

// ─── Dynamic Pricing Engine ───────────────────────────────────

export interface PricingContext {
  product: Product;
  competitorPrices: number[];
  demandScore: number; // 0-100
  inventoryDaysRemaining: number;
  seasonalFactor: number; // 1.0 = normal, >1 = high season
}

export function calculateDynamicPrice(ctx: PricingContext, maxChangePercent: number, minMarginPercent: number): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const currentPrice = product.price;
  const costOfGoods = product.costOfGoods;
  const minPrice = costOfGoods * (1 + minMarginPercent / 100);

  let recommendedPrice = currentPrice;
  const reasons: string[] = [];

  // Competitor-based adjustment
  if (competitorPrices.length > 0) {
    const avgCompetitor = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    const minCompetitor = Math.min(...competitorPrices);

    if (currentPrice > avgCompetitor * 1.1) {
      recommendedPrice *= 0.97;
      reasons.push('Priced 10%+ above competitor avg — reducing');
    } else if (currentPrice < minCompetitor * 0.95) {
      recommendedPrice *= 1.03;
      reasons.push('Priced below min competitor — opportunity to increase');
    }
  }

  // Demand-based adjustment
  if (demandScore > 75) {
    recommendedPrice *= 1 + (demandScore - 75) / 500;
    reasons.push(`High demand (${demandScore}/100) — price increase`);
  } else if (demandScore < 25) {
    recommendedPrice *= 1 - (25 - demandScore) / 500;
    reasons.push(`Low demand (${demandScore}/100) — price decrease`);
  }

  // Inventory pressure
  if (inventoryDaysRemaining < 7) {
    recommendedPrice *= 1.05;
    reasons.push(`Low stock (${inventoryDaysRemaining} days) — scarcity premium`);
  } else if (inventoryDaysRemaining > 90) {
    recommendedPrice *= 0.95;
    reasons.push(`Excess stock (${inventoryDaysRemaining} days) — clearance`);
  }

  // Seasonal factor
  recommendedPrice *= seasonalFactor;
  if (seasonalFactor > 1.05) reasons.push(`High season (${seasonalFactor.toFixed(2)}x)`);
  if (seasonalFactor < 0.95) reasons.push(`Low season (${seasonalFactor.toFixed(2)}x)`);

  // Enforce constraints
  const maxDelta = currentPrice * (maxChangePercent / 100);
  recommendedPrice = Math.max(minPrice, Math.min(recommendedPrice, currentPrice + maxDelta));
  recommendedPrice = Math.min(recommendedPrice, currentPrice + maxDelta);
  recommendedPrice = Math.max(recommendedPrice, currentPrice - maxDelta);

  const confidence = Math.min(
    50 + competitorPrices.length * 10 + Math.abs(demandScore - 50),
    100
  );

  return {
    productId: product.id,
    platform: product.platform,
    currentPrice,
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    reason: reasons.join('; ') || 'No significant pricing signal',
    confidence,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round((currentPrice + maxDelta) * 100) / 100,
  };
}

// ─── Inventory Forecasting ────────────────────────────────────

export interface SalesHistory {
  date: string;
  unitsSold: number;
}

export function forecastInventory(
  product: Product,
  salesHistory: SalesHistory[],
  leadTimeDays: number = 14,
  seasonalFactor: number = 1.0
): InventoryForecast {
  const recentDays = salesHistory.slice(-30);
  const totalSold = recentDays.reduce((sum, d) => sum + d.unitsSold, 0);
  const dailyVelocity = recentDays.length > 0 ? totalSold / recentDays.length : 0;
  const adjustedVelocity = dailyVelocity * seasonalFactor;

  const daysUntilStockout = adjustedVelocity > 0
    ? Math.floor(product.inventory / adjustedVelocity)
    : Infinity;

  // Safety stock = lead time demand + buffer
  const safetyStock = Math.ceil(adjustedVelocity * leadTimeDays * 1.5);
  const reorderPoint = Math.ceil(adjustedVelocity * leadTimeDays) + safetyStock;

  // EOQ approximation
  const annualDemand = adjustedVelocity * 365;
  const orderingCost = 25; // flat per-order cost estimate
  const holdingCostPerUnit = product.costOfGoods * 0.2;
  const eoq = holdingCostPerUnit > 0
    ? Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit))
    : Math.ceil(adjustedVelocity * 30);

  return {
    productId: product.id,
    platform: product.platform,
    currentStock: product.inventory,
    dailyVelocity: Math.round(adjustedVelocity * 100) / 100,
    daysUntilStockout: daysUntilStockout === Infinity ? 9999 : daysUntilStockout,
    reorderPoint,
    recommendedReorderQty: eoq,
    seasonalFactor,
  };
}

// ─── Listing Optimization ──────────────────────────────────────

export interface ListingScore {
  productId: string;
  platform: StorePlatform;
  titleScore: number;
  descriptionScore: number;
  tagScore: number;
  imageScore: number;
  overallScore: number;
  suggestions: string[];
}

export function scoreListingQuality(product: Product): ListingScore {
  const suggestions: string[] = [];
  let titleScore = 50;
  let descriptionScore = 50;
  let tagScore = 50;
  const imageScore = 50; // baseline without image data

  // Title scoring
  const titleLength = product.title.length;
  if (titleLength > 20 && titleLength < 80) {
    titleScore += 30;
  } else if (titleLength < 10) {
    titleScore -= 20;
    suggestions.push('Title too short — add descriptive keywords');
  } else if (titleLength > 150) {
    titleScore -= 10;
    suggestions.push('Title too long — trim to under 80 characters');
  }

  // Tag scoring
  if (product.tags.length >= 5 && product.tags.length <= 15) {
    tagScore += 30;
  } else if (product.tags.length < 3) {
    tagScore -= 20;
    suggestions.push('Add more tags (aim for 5-15) for discoverability');
  } else if (product.tags.length > 20) {
    tagScore -= 10;
    suggestions.push('Too many tags may dilute relevance — trim to best 15');
  }

  // Category check
  if (!product.category || product.category.length < 3) {
    descriptionScore -= 15;
    suggestions.push('Add a specific product category');
  } else {
    descriptionScore += 15;
  }

  // Price positioning
  if (product.price <= 0) {
    suggestions.push('Product has no price set');
  }

  if (product.status === 'draft') {
    suggestions.push('Product is still in draft — publish when ready');
  }

  const overallScore = Math.round((titleScore + descriptionScore + tagScore + imageScore) / 4);

  return {
    productId: product.id,
    platform: product.platform,
    titleScore: clampScore(titleScore),
    descriptionScore: clampScore(descriptionScore),
    tagScore: clampScore(tagScore),
    imageScore: clampScore(imageScore),
    overallScore: clampScore(overallScore),
    suggestions,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

// ─── Platform-Specific Strategy Hints ──────────────────────────

export interface PlatformStrategy {
  platform: StorePlatform;
  focusAreas: string[];
  pricingModel: string;
  keyMetrics: string[];
  uniqueCapabilities: string[];
}

export const STORE_PLATFORM_STRATEGIES: PlatformStrategy[] = [
  {
    platform: 'shopify',
    focusAreas: ['DTC brand building', 'Conversion rate optimization', 'Theme customization', 'App ecosystem'],
    pricingModel: 'Direct-to-consumer with full margin control',
    keyMetrics: ['Conversion rate', 'Average order value', 'Customer lifetime value', 'Cart abandonment rate'],
    uniqueCapabilities: ['Checkout optimization', 'Discount code strategy', 'Bundle pricing', 'Subscription management'],
  },
  {
    platform: 'amazon',
    focusAreas: ['Buy Box winning', 'FBA optimization', 'Advertising (PPC)', 'Review velocity'],
    pricingModel: 'Competitive marketplace with Buy Box algorithm',
    keyMetrics: ['Buy Box percentage', 'Organic rank', 'ACoS (ad cost of sale)', 'IPI score'],
    uniqueCapabilities: ['FBA inventory planning', 'Lightning deals', 'A+ Content optimization', 'Brand Registry features'],
  },
  {
    platform: 'etsy',
    focusAreas: ['SEO-driven discovery', 'Handmade/vintage positioning', 'Seasonal trends', 'Shop storytelling'],
    pricingModel: 'Niche/premium with perceived handmade value',
    keyMetrics: ['Search impressions', 'Favorites count', 'Shop score', 'Star seller status'],
    uniqueCapabilities: ['Tag optimization (13 tags)', 'Section organization', 'Custom order management', 'Pattern listings'],
  },
  {
    platform: 'ebay',
    focusAreas: ['Auction vs Buy-It-Now strategy', 'Seller ratings', 'Cross-listing', 'Best Offer management'],
    pricingModel: 'Auction dynamics + fixed price competition',
    keyMetrics: ['Sell-through rate', 'Defect rate', 'Time to sell', 'Best Offer acceptance rate'],
    uniqueCapabilities: ['Auction timing optimization', 'Promoted listings', 'Global Shipping Program', 'Volume pricing'],
  },
  {
    platform: 'square',
    focusAreas: ['POS integration', 'Local commerce', 'In-store + online sync', 'Appointment booking'],
    pricingModel: 'Local market pricing with convenience premium',
    keyMetrics: ['Transaction volume', 'Repeat customer rate', 'Inventory turnover', 'Online vs in-store ratio'],
    uniqueCapabilities: ['POS sync', 'Loyalty program', 'Invoice management', 'Team management'],
  },
  {
    platform: 'woocommerce',
    focusAreas: ['Plugin ecosystem', 'Self-hosted control', 'SEO ownership', 'Custom checkout flows'],
    pricingModel: 'Full pricing control with hosting cost consideration',
    keyMetrics: ['Site speed', 'Organic traffic', 'Plugin performance', 'Server costs'],
    uniqueCapabilities: ['Full database access', 'Custom plugin development', 'Unlimited customization', 'Data ownership'],
  },
];
