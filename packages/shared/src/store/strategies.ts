import type { Product, PricingAction, InventoryForecast, StorePlatform } from '../index';

// ─── Seasonal Factor Engine ───────────────────────────────────

/** Date-aware seasonal pricing factor. Returns multiplier (1.0 = baseline). */
export function getSeasonalFactor(date: Date = new Date()): number {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // Black Friday week (last week of November)
  if (month === 10 && day >= 24 && day <= 30) return 0.85; // clearance discounts
  // Cyber Monday (first Monday of December-ish)
  if (month === 11 && day <= 3) return 0.88;
  // Holiday shopping (Dec 1-20)
  if (month === 11 && day >= 1 && day <= 20) return 1.15;
  // Post-holiday clearance (Dec 26-31)
  if (month === 11 && day >= 26) return 0.80;
  // January clearance
  if (month === 0 && day <= 15) return 0.82;
  // Valentine's Day (Feb 7-14)
  if (month === 1 && day >= 7 && day <= 14) return 1.08;
  // Back-to-school (Aug)
  if (month === 7) return 1.06;
  // Summer lull (Jun-Jul)
  if (month === 5 || month === 6) return 0.95;

  return 1.0;
}

// ─── Dynamic Pricing Engine ───────────────────────────────────

export interface PricingContext {
  product: Product;
  competitorPrices: number[];
  demandScore: number; // 0-100
  inventoryDaysRemaining: number;
  seasonalFactor: number; // 1.0 = normal, >1 = high season
}

export function calculateDynamicPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number,
  platform?: StorePlatform
): PricingAction {
  // dispatch to platform-specific logic if available
  if (platform === 'shopify') return calculateShopifyPrice(ctx, maxChangePercent, minMarginPercent);
  if (platform === 'amazon') return calculateAmazonPrice(ctx, maxChangePercent, minMarginPercent);
  if (platform === 'etsy') return calculateEtsyPrice(ctx, maxChangePercent, minMarginPercent);
  if (platform === 'ebay') return calculateEbayPrice(ctx, maxChangePercent, minMarginPercent);
  if (platform === 'square') return calculateSquarePrice(ctx, maxChangePercent, minMarginPercent);
  if (platform === 'woocommerce') return calculateWooPrice(ctx, maxChangePercent, minMarginPercent);

  // default generic algorithm
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

  // Enforce constraints: stay within max change range AND above margin floor
  const maxDelta = currentPrice * (maxChangePercent / 100);
  const floor = Math.max(minPrice, currentPrice - maxDelta);
  const ceiling = currentPrice + maxDelta;
  recommendedPrice = Math.max(floor, Math.min(recommendedPrice, ceiling));

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

// ─── Platform-specific pricing helpers ───────────────────────

function applyConstraints(
  ctx: PricingContext,
  price: number,
  maxChangePercent: number,
  minMarginPercent: number,
): number {
  const minPrice = ctx.product.costOfGoods * (1 + minMarginPercent / 100);
  const maxDelta = ctx.product.price * (maxChangePercent / 100);
  const floor = Math.max(minPrice, ctx.product.price - maxDelta);
  const ceiling = ctx.product.price + maxDelta;
  return Math.round(Math.max(floor, Math.min(price, ceiling)) * 100) / 100;
}

function calculateShopifyPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // DTC margin optimization: target higher margins since no marketplace fees (~15-30% on marketplaces)
  const dtcMarginBoost = 1.04; // 4% premium — no marketplace cut
  price *= dtcMarginBoost;
  reasons.push('DTC margin optimization (+4% vs marketplace)');

  // Bundle pricing signal: high demand + good stock = opportunity for bundle upsell anchor
  if (demandScore > 60 && inventoryDaysRemaining > 30) {
    price *= 1.02;
    reasons.push('Bundle anchor pricing — strong demand with healthy stock');
  }

  // Abandoned cart recovery: low demand products benefit from slight price reduction
  if (demandScore < 30) {
    price *= 0.97;
    reasons.push('Cart recovery discount — low conversion signal');
  }

  // Competitor awareness (Shopify stores compete less directly, but still relevant)
  if (competitorPrices.length > 0) {
    const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    if (price > avg * 1.2) {
      price = avg * 1.12; // don't go above 12% premium for DTC
      reasons.push('Capped at 12% above competitor avg for DTC');
    }
  }

  // Seasonal + inventory pressure
  price *= seasonalFactor;
  if (seasonalFactor !== 1.0) reasons.push(`Seasonal factor ${seasonalFactor.toFixed(2)}x`);
  if (inventoryDaysRemaining < 7) { price *= 1.06; reasons.push('Scarcity premium — low stock'); }
  if (inventoryDaysRemaining > 90) { price *= 0.94; reasons.push('Excess inventory clearance'); }

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(45 + competitorPrices.length * 8 + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
  };
}

function calculateAmazonPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // Buy Box strategy: undercut lowest competitor by 1-2% to win the Buy Box
  if (competitorPrices.length > 0) {
    const minCompetitor = Math.min(...competitorPrices);
    const avgCompetitor = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;

    if (price > minCompetitor) {
      // Undercut by 1% but never below our floor
      price = minCompetitor * 0.99;
      reasons.push(`Buy Box strategy — undercut lowest ($${minCompetitor.toFixed(2)}) by 1%`);
    } else if (price < avgCompetitor * 0.85) {
      // Don't leave money on the table — align closer to market
      price = avgCompetitor * 0.92;
      reasons.push('Price recovery — was significantly below market avg');
    }
  }

  // FBA fee awareness: Amazon takes ~15% referral + FBA fees
  // High margin products can be more aggressive, low margin need protection
  const margin = (price - product.costOfGoods) / price;
  if (margin < 0.25) {
    price *= 1.03; // protect thin margins from FBA fee erosion
    reasons.push('Margin protection — FBA fee buffer');
  }

  // Demand-based velocity pricing
  if (demandScore > 80) {
    price *= 1.03; // hot sellers can command slight premium
    reasons.push(`High velocity (${demandScore}/100) — demand premium`);
  } else if (demandScore < 20) {
    price *= 0.96;
    reasons.push(`Low velocity (${demandScore}/100) — stimulate sales`);
  }

  // IPI score proxy: excess inventory hurts IPI, so clear aggressively
  if (inventoryDaysRemaining > 120) {
    price *= 0.90;
    reasons.push('IPI protection — clearing excess FBA inventory');
  } else if (inventoryDaysRemaining < 10) {
    price *= 1.08;
    reasons.push('Low FBA stock — scarcity pricing');
  }

  price *= seasonalFactor;
  if (seasonalFactor !== 1.0) reasons.push(`Seasonal ${seasonalFactor.toFixed(2)}x`);

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(40 + competitorPrices.length * 12 + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
  };
}

function calculateEtsyPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // Handmade/vintage premium: Etsy buyers expect and pay for craftsmanship
  const craftPremium = 1.08;
  price *= craftPremium;
  reasons.push('Handmade/artisan pricing premium (+8%)');

  // SEO tag optimization signal: well-tagged items command higher prices
  if (product.tags.length >= 10) {
    price *= 1.02;
    reasons.push('Strong discoverability (10+ tags) — premium positioning');
  } else if (product.tags.length < 5) {
    reasons.push('Note: add more tags (13 max) to improve search ranking');
  }

  // Star Seller threshold: keep price competitive to maintain volume for Star Seller
  if (competitorPrices.length > 0) {
    const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    if (price > avg * 1.3) {
      price = avg * 1.2; // cap at 20% above avg — Etsy tolerates higher premiums
      reasons.push('Capped at 20% above avg — Star Seller volume balance');
    }
  }

  // Seasonal (holidays are huge on Etsy — gifts)
  const etsySeasonalBoost = seasonalFactor > 1.0 ? seasonalFactor * 1.05 : seasonalFactor;
  price *= etsySeasonalBoost;
  if (etsySeasonalBoost > 1.05) reasons.push(`Gift season boost ${etsySeasonalBoost.toFixed(2)}x`);

  // Demand + inventory
  if (demandScore > 70) { price *= 1.03; reasons.push('High favorites/views — demand premium'); }
  if (inventoryDaysRemaining < 5) { price *= 1.10; reasons.push('Limited quantity — scarcity'); }
  if (inventoryDaysRemaining > 60) { price *= 0.96; reasons.push('Slow mover — gentle markdow'); }

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(35 + competitorPrices.length * 8 + (product.tags.length >= 10 ? 15 : 0) + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
  };
}

function calculateEbayPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // Auction vs Buy-It-Now dynamics: BIN typically commands 10-15% premium over auction median
  // Since we set BIN, price slightly above where auctions would settle
  if (competitorPrices.length > 0) {
    const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minComp = sortedPrices[0];

    // BIN premium over auction median
    const binPremium = median * 1.10;
    if (price > binPremium * 1.15) {
      price = binPremium;
      reasons.push(`BIN aligned to 10% above auction median ($${median.toFixed(2)})`);
    }

    // Best Offer floor: set competitive but with room to accept offers
    // Price 8% above minimum to allow "best offer" negotiation
    if (price < minComp * 1.08) {
      price = minComp * 1.08;
      reasons.push('Best Offer buffer — 8% above lowest for negotiation room');
    }
  }

  // Sell-through rate proxy: high demand = fast sell-through = can hold price
  if (demandScore > 70) {
    price *= 1.04;
    reasons.push(`Fast sell-through expected (${demandScore}/100)`);
  } else if (demandScore < 25) {
    price *= 0.94;
    reasons.push(`Slow sell-through (${demandScore}/100) — price to move`);
  }

  // Promoted listings consideration: lower price + promoted = better visibility
  if (inventoryDaysRemaining > 45 && demandScore < 40) {
    price *= 0.95;
    reasons.push('Promotional pricing — stimulate promoted listing ROI');
  }

  // Inventory + seasonal
  if (inventoryDaysRemaining < 5) { price *= 1.07; reasons.push('Last units — scarcity pricing'); }
  price *= seasonalFactor;
  if (seasonalFactor !== 1.0) reasons.push(`Seasonal ${seasonalFactor.toFixed(2)}x`);

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(40 + competitorPrices.length * 10 + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
  };
}

function calculateSquarePrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // Local market premium: POS/brick-and-mortar commands convenience premium
  price *= 1.06;
  reasons.push('Local convenience premium (+6% vs online-only)');

  // Volume discount tiers: high-velocity items benefit from volume pricing
  if (demandScore > 65 && inventoryDaysRemaining > 20) {
    price *= 0.97; // slight volume discount to drive repeat
    reasons.push('Volume loyalty pricing — high repeat potential');
  }

  // In-store vs online parity: if competitors are significantly cheaper online
  if (competitorPrices.length > 0) {
    const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    if (price > avg * 1.25) {
      price = avg * 1.15; // cap local premium at 15% above online avg
      reasons.push('Capped local premium at 15% above online avg');
    }
  }

  // Inventory turns: local shops need faster turnover
  if (inventoryDaysRemaining > 60) {
    price *= 0.93;
    reasons.push('Shelf space optimization — accelerate turnover');
  } else if (inventoryDaysRemaining < 7) {
    price *= 1.05;
    reasons.push('Low shelf stock — scarcity');
  }

  price *= seasonalFactor;
  if (seasonalFactor !== 1.0) reasons.push(`Seasonal ${seasonalFactor.toFixed(2)}x`);

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(50 + competitorPrices.length * 6 + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
  };
}

function calculateWooPrice(
  ctx: PricingContext,
  maxChangePercent: number,
  minMarginPercent: number
): PricingAction {
  const { product, competitorPrices, demandScore, inventoryDaysRemaining, seasonalFactor } = ctx;
  const reasons: string[] = [];
  let price = product.price;

  // Self-hosted advantage: no marketplace fees, can undercut marketplace sellers
  price *= 0.97;
  reasons.push('Self-hosted advantage — 3% undercut vs marketplaces');

  // SEO-driven pricing: organic traffic = lower acquisition cost = can be more competitive
  if (competitorPrices.length > 0) {
    const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    if (price > avg * 1.05) {
      price = avg * 1.0; // aim for parity — win on site experience
      reasons.push('SEO parity pricing — compete on experience not price');
    } else if (price < avg * 0.80) {
      price = avg * 0.88;
      reasons.push('Price recovery — was too far below market');
    }
  }

  // Hosting cost consideration: factor in server costs for low-margin items
  const margin = (price - product.costOfGoods) / price;
  if (margin < 0.15) {
    price *= 1.05;
    reasons.push('Hosting cost buffer — thin margin protection');
  }

  // Demand + inventory
  if (demandScore > 75) { price *= 1.03; reasons.push('High organic demand — slight premium'); }
  if (demandScore < 20) { price *= 0.96; reasons.push('Low traffic — discount to stimulate'); }
  if (inventoryDaysRemaining > 90) { price *= 0.93; reasons.push('Warehouse clearance'); }
  if (inventoryDaysRemaining < 7) { price *= 1.05; reasons.push('Low stock premium'); }

  price *= seasonalFactor;
  if (seasonalFactor !== 1.0) reasons.push(`Seasonal ${seasonalFactor.toFixed(2)}x`);

  price = applyConstraints(ctx, price, maxChangePercent, minMarginPercent);
  const confidence = Math.min(50 + competitorPrices.length * 8 + Math.abs(demandScore - 50), 100);

  return {
    productId: product.id, platform: product.platform,
    currentPrice: product.price, recommendedPrice: price,
    reason: reasons.join('; '), confidence,
    minPrice: Math.round(product.costOfGoods * (1 + minMarginPercent / 100) * 100) / 100,
    maxPrice: Math.round((product.price * (1 + maxChangePercent / 100)) * 100) / 100,
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

// ─── Review Sentiment Analysis ─────────────────────────────────

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'love', 'happy', 'satisfied', 'amazing', 'perfect',
  'fantastic', 'wonderful', 'awesome', 'outstanding', 'superb', 'impressive', 'beautiful',
  'recommend', 'best', 'quality', 'fast', 'reliable', 'sturdy', 'durable', 'lovely',
  'works great', 'well made', 'high quality', 'exceeded expectations', 'highly recommend',
  'worth every penny', 'five stars', '5 stars', 'top notch',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'poor', 'hate', 'disappointed', 'horrible', 'worst',
  'broken', 'broke', 'defective', 'cheap', 'flimsy', 'waste', 'useless', 'junk', 'scam',
  'misleading', 'damaged', 'return', 'refund', 'missing', 'wrong', 'fake', 'overpriced',
  'fell apart', 'does not work', 'stopped working', 'never arrived', 'poor quality',
  'waste of money', 'not as described', 'do not buy', 'one star', '1 star',
];

const INTENSITY_MODIFIERS: Record<string, number> = {
  'very': 1.5, 'extremely': 2.0, 'incredibly': 1.8, 'absolutely': 1.8,
  'really': 1.3, 'totally': 1.5, 'completely': 1.6, 'somewhat': 0.6,
  'slightly': 0.4, 'pretty': 0.8, 'quite': 1.2, 'super': 1.6,
};

const NEGATION_WORDS = ['not', "n't", 'no', 'never', 'neither', 'nor', 'hardly', 'barely', 'scarcely'];

export function analyzeReviewSentiment(text: string): { score: number; label: string; reasons: string[] } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let score = 0.5;
  const reasons: string[] = [];

  // Check multi-word phrases first (bigrams/trigrams)
  for (const phrase of POSITIVE_WORDS.filter(w => w.includes(' '))) {
    if (lower.includes(phrase)) { score += 0.12; reasons.push(`+phrase: "${phrase}"`); }
  }
  for (const phrase of NEGATIVE_WORDS.filter(w => w.includes(' '))) {
    if (lower.includes(phrase)) { score -= 0.12; reasons.push(`-phrase: "${phrase}"`); }
  }

  // Single-word analysis with negation + intensity awareness
  const singlePositive = POSITIVE_WORDS.filter(w => !w.includes(' '));
  const singleNegative = NEGATIVE_WORDS.filter(w => !w.includes(' '));

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z']/g, '');
    if (!word) continue;

    // Check for negation in preceding 2 words
    const hasNegation = (i > 0 && NEGATION_WORDS.some(n => words[i - 1].includes(n))) ||
                        (i > 1 && NEGATION_WORDS.some(n => words[i - 2].includes(n)));

    // Check for intensity modifier in preceding word
    let intensity = 1.0;
    if (i > 0) {
      const prev = words[i - 1].replace(/[^a-z]/g, '');
      if (INTENSITY_MODIFIERS[prev]) intensity = INTENSITY_MODIFIERS[prev];
    }

    if (singlePositive.includes(word)) {
      const delta = 0.08 * intensity * (hasNegation ? -1 : 1);
      score += delta;
      reasons.push(hasNegation ? `-negated positive: "${word}"` : `+word: "${word}"`);
    } else if (singleNegative.includes(word)) {
      const delta = 0.08 * intensity * (hasNegation ? -1 : 1);
      score -= delta;
      reasons.push(hasNegation ? `+negated negative: "${word}"` : `-word: "${word}"`);
    }
  }

  // Exclamation marks amplify sentiment direction
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 0 && score !== 0.5) {
    const amplify = 1 + exclamations * 0.05;
    score = 0.5 + (score - 0.5) * amplify;
  }

  // ALL CAPS words indicate strong emotion
  const capsWords = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase()).length;
  if (capsWords > 0 && score !== 0.5) {
    score = 0.5 + (score - 0.5) * (1 + capsWords * 0.08);
  }

  score = Math.min(1, Math.max(0, score));
  const label = score < 0.35 ? 'negative' : score > 0.65 ? 'positive' : 'neutral';
  return { score: Math.round(score * 100) / 100, label, reasons };
}

export function scoreListingQuality(product: Product): ListingScore {
  const suggestions: string[] = [];
  let titleScore = 50;
  let descriptionScore = 50;
  let tagScore = 50;
  let imageScore = 50; // baseline without image data

  // ─── Title scoring (platform-aware) ───
  const titleLength = product.title.length;
  const titleWords = product.title.split(/\s+/).length;
  const hasNumbers = /\d/.test(product.title);
  const hasBrand = /^[A-Z]/.test(product.title); // crude brand detection

  if (titleLength > 20 && titleLength < 80) {
    titleScore += 25;
  } else if (titleLength < 10) {
    titleScore -= 20;
    suggestions.push('Title too short — add descriptive keywords');
  } else if (titleLength > 150) {
    titleScore -= 10;
    suggestions.push('Title too long — trim to under 80 characters');
  }

  if (titleWords >= 4 && titleWords <= 12) titleScore += 10;
  if (hasNumbers) titleScore += 5; // sizes, quantities, model numbers help
  if (hasBrand) titleScore += 5;

  // Platform-specific title guidance
  if (product.platform === 'amazon' && titleLength < 60) {
    suggestions.push('Amazon: lengthen title to include key attributes (brand, size, color, qty)');
    titleScore -= 10;
  }
  if (product.platform === 'etsy' && titleLength < 40) {
    suggestions.push('Etsy: descriptive titles with natural language boost search ranking');
    titleScore -= 5;
  }

  // ─── Description scoring ───
  // Use category as proxy for description richness (real adapter would have description)
  if (!product.category || product.category.length < 3) {
    descriptionScore -= 15;
    suggestions.push('Add a specific product category');
  } else {
    descriptionScore += 15;
    // Category keyword should appear in title for SEO
    if (product.title.toLowerCase().includes(product.category.toLowerCase())) {
      descriptionScore += 10;
    } else {
      suggestions.push('Include category keyword in title for SEO');
    }
  }

  // URL presence suggests published and accessible
  if (product.url && product.url.length > 0) {
    descriptionScore += 5;
  }

  // Status affects listing score
  if (product.status === 'active') {
    descriptionScore += 5;
  } else if (product.status === 'draft') {
    descriptionScore -= 10;
    suggestions.push('Product is still in draft — publish when ready');
  }

  // ─── Tag scoring (platform-aware) ───
  const platformMaxTags: Record<string, number> = {
    etsy: 13, amazon: 7, shopify: 15, ebay: 10, square: 10, woocommerce: 20,
  };
  const maxTags = platformMaxTags[product.platform] || 15;

  if (product.tags.length >= Math.min(5, maxTags) && product.tags.length <= maxTags) {
    tagScore += 30;
  } else if (product.tags.length < 3) {
    tagScore -= 20;
    suggestions.push(`Add more tags (aim for ${Math.min(5, maxTags)}-${maxTags}) for discoverability`);
  } else if (product.tags.length > maxTags + 5) {
    tagScore -= 10;
    suggestions.push(`Too many tags — ${product.platform} works best with ≤${maxTags} focused tags`);
  }

  // Check tag quality: long, descriptive tags are better than single words
  const avgTagLength = product.tags.length > 0
    ? product.tags.reduce((sum, t) => sum + t.length, 0) / product.tags.length
    : 0;
  if (avgTagLength > 8) tagScore += 10; // multi-word tags
  if (avgTagLength < 4 && product.tags.length > 0) {
    tagScore -= 5;
    suggestions.push('Use descriptive multi-word tags (e.g., "handmade leather bag" not just "bag")');
  }

  // Check for duplicate tags
  const uniqueTags = new Set(product.tags.map(t => t.toLowerCase()));
  if (uniqueTags.size < product.tags.length) {
    tagScore -= 10;
    suggestions.push('Remove duplicate tags');
  }

  // ─── Image scoring ───
  // Without direct image data, score based on platform expectations
  if (product.platform === 'etsy') {
    imageScore = 40; // Etsy heavily weights images — conservative baseline
    suggestions.push('Etsy: ensure 5+ high-quality photos with white/lifestyle backgrounds');
  } else if (product.platform === 'amazon') {
    imageScore = 45;
    suggestions.push('Amazon: use white background main image + lifestyle/infographic additional images');
  }

  // ─── Price positioning ───
  if (product.price <= 0) {
    suggestions.push('Product has no price set');
    descriptionScore -= 10;
  }

  // Cost of goods check
  if (product.costOfGoods > 0 && product.price > 0) {
    const margin = (product.price - product.costOfGoods) / product.price;
    if (margin < 0.2) {
      suggestions.push('Low margin (<20%) — consider raising price or reducing COGS');
    }
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

// ─── Listing Optimization Helpers ──────────────────────────────

export interface ListingOptimization {
  productId: string;
  platform: StorePlatform;
  optimizedTitle: string;
  suggestedTags: string[];
  titleChanges: string[];
  tagChanges: string[];
}

export function optimizeListing(product: Product): ListingOptimization {
  const titleChanges: string[] = [];
  const tagChanges: string[] = [];
  let optimizedTitle = product.title;
  let suggestedTags = [...product.tags];

  // Title optimization
  // Ensure category keyword appears in title
  if (product.category && !optimizedTitle.toLowerCase().includes(product.category.toLowerCase())) {
    optimizedTitle = `${optimizedTitle} - ${product.category}`;
    titleChanges.push(`Added category "${product.category}" to title`);
  }

  // Remove excessive punctuation
  const cleaned = optimizedTitle.replace(/[!]{2,}/g, '!').replace(/[.]{3,}/g, '...').replace(/\s{2,}/g, ' ');
  if (cleaned !== optimizedTitle) {
    optimizedTitle = cleaned;
    titleChanges.push('Cleaned excessive punctuation');
  }

  // Capitalize first letter of each word for readability on most platforms
  if (product.platform !== 'etsy') { // Etsy prefers natural language titles
    optimizedTitle = optimizedTitle.replace(/\b\w/g, c => c.toUpperCase());
    if (optimizedTitle !== product.title) titleChanges.push('Title case applied');
  }

  // Tag optimization
  // Remove duplicates
  const uniqueTags = [...new Set(suggestedTags.map(t => t.toLowerCase()))];
  if (uniqueTags.length < suggestedTags.length) {
    suggestedTags = uniqueTags;
    tagChanges.push(`Removed ${product.tags.length - uniqueTags.length} duplicate tags`);
  }

  // Add category as tag if missing
  if (product.category && !suggestedTags.some(t => t.toLowerCase() === product.category.toLowerCase())) {
    suggestedTags.push(product.category.toLowerCase());
    tagChanges.push(`Added category "${product.category}" as tag`);
  }

  // Platform-specific tag count enforcement
  const platformMaxTags: Record<string, number> = {
    etsy: 13, amazon: 7, shopify: 15, ebay: 10, square: 10, woocommerce: 20,
  };
  const maxTags = platformMaxTags[product.platform] || 15;
  if (suggestedTags.length > maxTags) {
    // Keep longest (most descriptive) tags
    suggestedTags = suggestedTags
      .sort((a, b) => b.length - a.length)
      .slice(0, maxTags);
    tagChanges.push(`Trimmed to ${maxTags} most descriptive tags for ${product.platform}`);
  }

  if (titleChanges.length === 0) titleChanges.push('Title already well-optimized');
  if (tagChanges.length === 0) tagChanges.push('Tags already well-optimized');

  return {
    productId: product.id,
    platform: product.platform,
    optimizedTitle: optimizedTitle.trim(),
    suggestedTags,
    titleChanges,
    tagChanges,
  };
}

// ─── Competitor Price Analysis ─────────────────────────────────

export interface CompetitorAnalysis {
  productId: string;
  platform: StorePlatform;
  currentPrice: number;
  competitorMin: number;
  competitorMax: number;
  competitorAvg: number;
  competitorMedian: number;
  pricePosition: 'lowest' | 'below_avg' | 'at_avg' | 'above_avg' | 'highest';
  percentFromAvg: number;
  actionRequired: boolean;
  recommendation: string;
}

export function analyzeCompetitorPrices(
  product: Product,
  competitorPrices: number[],
): CompetitorAnalysis {
  if (competitorPrices.length === 0) {
    return {
      productId: product.id,
      platform: product.platform,
      currentPrice: product.price,
      competitorMin: 0,
      competitorMax: 0,
      competitorAvg: 0,
      competitorMedian: 0,
      pricePosition: 'at_avg',
      percentFromAvg: 0,
      actionRequired: false,
      recommendation: 'No competitor data available',
    };
  }

  const sorted = [...competitorPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const percentFromAvg = ((product.price - avg) / avg) * 100;

  let pricePosition: CompetitorAnalysis['pricePosition'];
  if (product.price <= min) pricePosition = 'lowest';
  else if (product.price >= max) pricePosition = 'highest';
  else if (percentFromAvg < -5) pricePosition = 'below_avg';
  else if (percentFromAvg > 5) pricePosition = 'above_avg';
  else pricePosition = 'at_avg';

  let actionRequired = false;
  let recommendation: string;

  if (percentFromAvg > 15) {
    actionRequired = true;
    recommendation = `Price is ${percentFromAvg.toFixed(1)}% above avg — consider reducing to stay competitive`;
  } else if (percentFromAvg < -15) {
    actionRequired = true;
    recommendation = `Price is ${Math.abs(percentFromAvg).toFixed(1)}% below avg — opportunity to increase margin`;
  } else if (pricePosition === 'highest' && competitorPrices.length >= 3) {
    actionRequired = true;
    recommendation = `Highest priced among ${competitorPrices.length} competitors — may lose sales`;
  } else {
    recommendation = `Price well-positioned (${percentFromAvg >= 0 ? '+' : ''}${percentFromAvg.toFixed(1)}% from avg)`;
  }

  return {
    productId: product.id,
    platform: product.platform,
    currentPrice: product.price,
    competitorMin: Math.round(min * 100) / 100,
    competitorMax: Math.round(max * 100) / 100,
    competitorAvg: Math.round(avg * 100) / 100,
    competitorMedian: Math.round(median * 100) / 100,
    pricePosition,
    percentFromAvg: Math.round(percentFromAvg * 100) / 100,
    actionRequired,
    recommendation,
  };
}

// ─── Review Response Generation ────────────────────────────────

export interface ReviewResponse {
  reviewText: string;
  sentiment: { score: number; label: string };
  suggestedResponse: string;
  priority: 'high' | 'medium' | 'low';
  responseType: 'apology' | 'thank_you' | 'acknowledgment' | 'follow_up';
}

export function generateReviewResponse(
  reviewText: string,
  productTitle: string,
): ReviewResponse {
  const sentiment = analyzeReviewSentiment(reviewText);
  const lower = reviewText.toLowerCase();

  let suggestedResponse: string;
  let priority: ReviewResponse['priority'];
  let responseType: ReviewResponse['responseType'];

  if (sentiment.label === 'negative') {
    priority = 'high';

    // Detect specific issues for tailored responses
    const hasShippingIssue = /ship|deliver|arriv|late|lost|tracking/i.test(lower);
    const hasQualityIssue = /broke|broken|defect|damage|cheap|flimsy|quality/i.test(lower);
    const hasExpectationIssue = /expect|descri|picture|photo|differ|mislead/i.test(lower);

    if (hasShippingIssue) {
      responseType = 'apology';
      suggestedResponse = `We sincerely apologize for the shipping issues with your ${productTitle}. This is not the experience we want for our customers. Please reach out to our support team so we can track your order and make this right immediately.`;
    } else if (hasQualityIssue) {
      responseType = 'apology';
      suggestedResponse = `We're sorry to hear about the quality issue with your ${productTitle}. We take product quality very seriously and would like to offer a replacement or full refund. Please contact our support team at your earliest convenience.`;
    } else if (hasExpectationIssue) {
      responseType = 'apology';
      suggestedResponse = `We apologize that the ${productTitle} didn't meet your expectations. We're reviewing our listing description to ensure accuracy. We'd love to make this right — please reach out to our support team for a return or exchange.`;
    } else {
      responseType = 'apology';
      suggestedResponse = `We're sorry to hear about your experience with the ${productTitle}. Your feedback is important to us and we're working to improve. Please contact our support team so we can resolve this for you.`;
    }
  } else if (sentiment.label === 'positive') {
    priority = 'low';
    responseType = 'thank_you';

    const hasRepeatBuyer = /again|another|second|reorder|repurchase/i.test(lower);
    const hasRecommendation = /recommend|friend|family|everyone/i.test(lower);

    if (hasRepeatBuyer) {
      suggestedResponse = `Thank you so much for being a loyal customer! We're thrilled you love the ${productTitle} enough to come back. Your continued support means the world to us!`;
    } else if (hasRecommendation) {
      suggestedResponse = `Wow, thank you for recommending the ${productTitle}! Word of mouth from satisfied customers like you is the highest compliment we can receive. We truly appreciate your support!`;
    } else {
      suggestedResponse = `Thank you for your wonderful review of the ${productTitle}! We're so glad you're happy with your purchase. We work hard to deliver quality products and your feedback brightens our day!`;
    }
  } else {
    priority = 'medium';
    responseType = 'acknowledgment';

    const hasQuestion = /\?|how|when|can|does|will/i.test(lower);
    if (hasQuestion) {
      responseType = 'follow_up';
      suggestedResponse = `Thank you for your feedback on the ${productTitle}. We noticed you may have a question — please don't hesitate to reach out to our support team and we'll be happy to help!`;
    } else {
      suggestedResponse = `Thank you for taking the time to share your thoughts on the ${productTitle}. We value all customer feedback and are always looking for ways to improve your experience.`;
    }
  }

  return { reviewText, sentiment, suggestedResponse, priority, responseType };
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
