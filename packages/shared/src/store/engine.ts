import type {
  StorePlatform,
  Product,
  StoreBotConfig,
  TickResult,
} from '../index';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { promptLLM, promptWithTemplate } from '../llm.js';
import {
  SENTIMENT_ANALYSIS_TEMPLATE,
  PRICING_INSIGHT_TEMPLATE,
  batchKeywordSentiment,
  type SentimentResult,
  type PricingInsight,
} from '../prompts.js';
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

        // LLM pricing insight (non-blocking — enriches audit log)
        if (state.config.useLLM) {
          try {
            const { result: insight, raw } = await promptWithTemplate(
              PRICING_INSIGHT_TEMPLATE,
              {
                productTitle: product.title,
                currentPrice: product.price,
                competitorPrices,
                demandScore,
                inventoryDays: daysRemaining,
                platform: state.config.platform,
                costOfGoods: product.costOfGoods,
              },
            );
            logAuditEntry({
              tenantId: state.safety.tenantId,
              botId: state.safety.botId,
              platform: state.config.platform,
              action: 'llm_pricing_insight',
              result: 'success',
              riskLevel: 'low',
              details: { insight, raw },
            });
          } catch (e) {
            // LLM failures never block pricing
          }
        }

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

    // ─── Review Management (LLM-enhanced sentiment) ──
    if (state.config.strategies.includes('review_management')) {
      try {
        const reviews: { id: string; rating: number; text: string }[] = await (adapter as any).getReviews?.() ?? [];
        if (reviews.length === 0) {
          actions.push('🛎️ Checked reviews: no new reviews');
        } else {
          // Use LLM for batch sentiment or fall back to keyword analysis
          let sentimentReport: SentimentResult;
          if (state.config.useLLM) {
            const { result } = await promptWithTemplate(
              SENTIMENT_ANALYSIS_TEMPLATE,
              { reviews, platform: state.config.platform },
            );
            sentimentReport = result ?? batchKeywordSentiment(reviews);
          } else {
            sentimentReport = batchKeywordSentiment(reviews);
          }

          actions.push(
            `📊 Sentiment: ${sentimentReport.overallLabel} (${sentimentReport.overallScore.toFixed(2)}) across ${reviews.length} reviews`
          );

          // Act on negative reviews
          for (const rs of sentimentReport.reviewSentiments) {
            if (rs.score < -0.1) {
              const rev = reviews.find(r => r.id === rs.id);
              if (rev) {
                actions.push(`🔻 Negative review (${rev.rating}★): ${rs.keyPhrases.join(', ')}`);
                if (
                  state.config.autoApplyPricing &&
                  !state.config.paperMode &&
                  (state.config.autonomyLevel ?? 'manual') === 'auto'
                ) {
                  const resp = `We appreciate your feedback and are working to address this.`;
                  await (adapter as any).respondToReview?.(rev.id, resp);
                  actions.push(`↩️ responded to review ${rev.id}`);
                }
              }
            }
          }

          // Surface action items from sentiment analysis
          for (const item of sentimentReport.actionItems) {
            actions.push(`💡 ${item}`);
          }

          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: 'sentiment_analysis',
            result: 'success',
            riskLevel: 'low',
            details: {
              overallScore: sentimentReport.overallScore,
              overallLabel: sentimentReport.overallLabel,
              themes: sentimentReport.themes,
              actionItems: sentimentReport.actionItems,
            },
          });
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
