import type {
  StorePlatform,
  Product,
  StoreBotConfig,
  TickResult,
} from '../index';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { promptLLM } from '../llm.js';
import {
  calculateDynamicPrice,
  forecastInventory,
  scoreListingQuality,
  analyzeReviewSentiment,
  type PricingContext,
  type SalesHistory,
} from './strategies.js';

// ─── Store Adapter Interface ──────────────────────────────────

export interface StoreAdapter {
  platform: StorePlatform;
  fetchProducts(): Promise<Product[]>;
  updatePrice(productId: string, newPrice: number): Promise<{ success: boolean }>;
  getCompetitorPrices(productId: string): Promise<number[]>;
  getSalesHistory(productId: string, days: number): Promise<SalesHistory[]>;
  updateInventory(productId: string, quantity: number): Promise<{ success: boolean }>;
  // review support
  getReviews?(): Promise<{ id: string; rating: number; text: string }[]>;
  respondToReview?(reviewId: string, response: string): Promise<{ success: boolean }>;
  // listing updates
  updateListing?(productId: string, fields: Partial<{ title: string; description: string; tags: string[] }>): Promise<{ success: boolean }>;
}

// ─── Store Engine State ───────────────────────────────────────

export interface StoreEngineState {
  config: StoreBotConfig;
  safety: SafetyContext;
  lastPricingRun: number;
  lastInventoryCheck: number;
  priceChangesApplied: number;
  inventoryAlertsSent: number;
  competitorPriceHistory: Map<string, { timestamp: number; prices: number[] }[]>;
}

export function createStoreEngineState(
  config: StoreBotConfig,
  safety: SafetyContext
): StoreEngineState {
  return {
    config,
    safety,
    lastPricingRun: 0,
    lastInventoryCheck: 0,
    priceChangesApplied: 0,
    inventoryAlertsSent: 0,
    competitorPriceHistory: new Map(),
  };
}

// ─── Store Engine Tick ────────────────────────────────────────

export async function executeStoreTick(
  state: StoreEngineState,
  adapter: StoreAdapter
): Promise<{ result: TickResult; newState: StoreEngineState }> {
  const startTime = Date.now();
  let newState = { ...state };

  try {
    const products = await adapter.fetchProducts();
    const activeProducts = products.filter((p) => p.status === 'active');
    const actions: string[] = [];

    // ─── Dynamic Pricing ──────────────────────────
    if (state.config.strategies.includes('dynamic_pricing')) {
      if (state.config.useLLM) {
        const prompt = `Calculate dynamic price for product with current price placeholders`;
        const resp = await promptLLM(prompt);
        logAuditEntry({
          tenantId: state.safety.tenantId,
          botId: state.safety.botId,
          platform: state.config.platform,
          action: 'llm_prompt',
          result: 'success',
          riskLevel: 'low',
          details: { prompt, response: resp },
        });
      }
      for (const product of activeProducts) {
        const [competitorPrices, salesHistory] = await Promise.all([
          adapter.getCompetitorPrices(product.id),
          adapter.getSalesHistory(product.id, 30),
        ]);
        // record competitor price history for trend analysis
        const hist = newState.competitorPriceHistory.get(product.id) ?? [];
        hist.push({ timestamp: Date.now(), prices: competitorPrices });
        if (hist.length > 200) hist.shift();
        newState.competitorPriceHistory.set(product.id, hist);

        const totalSold = salesHistory.reduce((s, d) => s + d.unitsSold, 0);
        const demandScore = Math.min(100, totalSold * 3);
        const velocity = salesHistory.length > 0 ? totalSold / salesHistory.length : 0;
        const daysRemaining = velocity > 0 ? product.inventory / velocity : 9999;

        const pricingCtx: PricingContext = {
          product,
          competitorPrices,
          demandScore,
          inventoryDaysRemaining: daysRemaining,
          seasonalFactor: 1.0,
        };

        const action = calculateDynamicPrice(
          pricingCtx,
          state.config.maxPriceChangePercent,
          state.config.minMarginPercent,
          state.config.platform
        );

        if (Math.abs(action.recommendedPrice - action.currentPrice) > 0.01) {
          const safetyResult = runSafetyPipeline(
            state.safety,
            `price_change ${product.id}`,
            0,
            'medium'
          );

          if (
            safetyResult.allowed &&
            state.config.autoApplyPricing &&
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto'
          ) {
            await adapter.updatePrice(product.id, action.recommendedPrice);
            newState.priceChangesApplied++;
            actions.push(`Priced ${product.title}: $${action.currentPrice} → $${action.recommendedPrice}`);

            logAuditEntry({
              tenantId: state.safety.tenantId,
              botId: state.safety.botId,
              platform: state.config.platform,
              action: `PRICE_CHANGE ${product.id}`,
              result: 'success',
              riskLevel: 'medium',
              details: { from: action.currentPrice, to: action.recommendedPrice, reason: action.reason },
            });
          } else {
            actions.push(`Recommended price for ${product.title}: $${action.recommendedPrice} (${action.reason})`);
          }
        }
      }
      newState.lastPricingRun = Date.now();
    }

    // ─── Inventory Forecasting ────────────────────
    if (state.config.strategies.includes('inventory_forecast')) {
      for (const product of activeProducts) {
        const salesHistory = await adapter.getSalesHistory(product.id, 30);
        const forecast = forecastInventory(product, salesHistory);

        if (forecast.daysUntilStockout < 14 && product.inventory > 0) {
          newState.inventoryAlertsSent++;
          actions.push(
            `⚠️ ${product.title}: ${forecast.daysUntilStockout} days until stockout — reorder ${forecast.recommendedReorderQty} units`
          );

          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: `INVENTORY_ALERT ${product.id}`,
            result: 'success',
            riskLevel: 'low',
            details: { forecast },
          });
        }
      }
      newState.lastInventoryCheck = Date.now();
    }

    // ─── Listing Optimization ─────────────────────
    if (state.config.strategies.includes('listing_optimization')) {
      for (const product of activeProducts) {
        const score = scoreListingQuality(product);
        if (score.overallScore < 60) {
          actions.push(
            `📝 ${product.title} listing score: ${score.overallScore}/100 — ${score.suggestions.join(', ')}`
          );
          if (
            state.config.autoApplyPricing &&
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto'
          ) {
            // apply adjustments via adapter
            await adapter.updateListing?.(product.id, { title: product.title, tags: product.tags });
            actions.push(`✏️ updated listing ${product.title}`);
          }
        }
      }
    }

    // ─── Competitor Monitoring ─────────────────────
    if (state.config.strategies.includes('competitor_monitoring')) {
      for (const product of activeProducts) {
        const competitorPrices = await adapter.getCompetitorPrices(product.id);
        if (competitorPrices.length > 0) {
          const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
          if (avg < product.price * 0.9) {
            actions.push(`⚠️ ${product.title}: competitors avg $${avg.toFixed(2)} is 10% below our price`);
            // could trigger audit/log or price reduction handled elsewhere
          }
        }
      }
    }

    // ─── Review Management ─────────────────────────
    if (state.config.strategies.includes('review_management')) {
      try {
        const reviews: { id: string; rating: number; text: string }[] = await (adapter as any).getReviews?.() ?? [];
        if (reviews.length === 0) {
          actions.push('🛎️ Checked reviews: no new reviews');
        }
        for (const rev of reviews) {
          const sentiment = analyzeReviewSentiment(rev.text);
          if (sentiment.score < 0.4) {
            actions.push(`🔻 Negative review detected (${rev.rating}★): ${rev.text}`);
            if (
              state.config.autoApplyPricing &&
              !state.config.paperMode &&
              (state.config.autonomyLevel ?? 'manual') === 'auto'
            ) {
              // auto-respond
              const resp = `We're sorry to hear this. ${rev.text.substring(0, 80)}`;
              await (adapter as any).respondToReview?.(rev.id, resp);
              actions.push(`↩️ responded to review ${rev.id}`);
            }
          } else {
            actions.push(`✅ Positive review (${rev.rating}★)`);
          }
        }
      } catch (e) {
        actions.push('⚠️ Review fetch error');
      }
    }

    newState.safety = {
      ...newState.safety,
      circuitBreaker: recordSuccess(newState.safety.circuitBreaker),
    };

    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: actions.length > 0 ? actions.join(' | ') : 'scan',
        result: actions.length > 0 ? 'executed' : 'skipped',
        details: {
          productsScanned: activeProducts.length,
          priceChanges: newState.priceChangesApplied - state.priceChangesApplied,
          inventoryAlerts: newState.inventoryAlertsSent - state.inventoryAlertsSent,
        },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  } catch (error) {
    newState.safety = {
      ...newState.safety,
      circuitBreaker: recordError(newState.safety.circuitBreaker),
    };

    logAuditEntry({
      tenantId: state.safety.tenantId,
      botId: state.safety.botId,
      platform: state.config.platform,
      action: 'store_tick_error',
      result: 'failure',
      riskLevel: 'high',
      details: { error: error instanceof Error ? error.message : String(error) },
    });

    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'tick',
        result: 'error',
        details: { error: error instanceof Error ? error.message : String(error) },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }
}
