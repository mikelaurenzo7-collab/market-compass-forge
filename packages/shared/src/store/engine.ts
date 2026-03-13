import type {
  StorePlatform,
  Product,
  StoreBotConfig,
  TickResult,
} from '../index.js';
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
  getSeasonalFactor,
  optimizeListing,
  analyzeCompetitorPrices,
  generateReviewResponse,
  type PricingContext,
  type SalesHistory,
} from './strategies.js';
import { fetchGoogleTrends, trendDemandSignal } from '../market-intelligence.js';
import { analyzeProductImage, forecastTimeSeries } from '../vertex-ai.js';

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
        let demandScore = Math.min(100, totalSold * 3);
        const velocity = salesHistory.length > 0 ? totalSold / salesHistory.length : 0;
        const daysRemaining = velocity > 0 ? product.inventory / velocity : 9999;

        // ── Google Trends demand enrichment ─────
        // Boost or dampen demand score based on real-time search interest
        try {
          const keywords = product.title.split(/\s+/).slice(0, 3);
          const trends = await fetchGoogleTrends(keywords);
          if (trends.length > 0) {
            const avgSignal = trends.reduce((s, t) => s + trendDemandSignal(t), 0) / trends.length;
            // avgSignal: -1 (declining) to +2 (breakout). Map to ±20 demand points
            demandScore = Math.max(0, Math.min(100, demandScore + avgSignal * 15));
          }
        } catch {
          // Trends enrichment is non-blocking
        }

        // ── Vertex AI demand forecasting ────────
        // Use historical sales data for ML-based demand prediction
        if (salesHistory.length >= 14) {
          try {
            const salesValues: Array<[number, number]> = salesHistory.map((d, i) => [Date.now() - (salesHistory.length - 1 - i) * 86400000, d.unitsSold]);
            const forecast = await forecastTimeSeries(salesValues, 7, 86400000);
            if (forecast) {
              const forecastAvg = forecast.predictions.reduce((s, p) => s + p.value, 0) / forecast.predictions.length;
              const historicalAvg = salesValues.reduce((s, v) => s + v[1], 0) / salesValues.length;
              // If forecast predicts surge/decline, adjust demand score
              if (historicalAvg > 0) {
                const ratio = forecastAvg / historicalAvg;
                demandScore = Math.max(0, Math.min(100, demandScore * ratio));
              }
            }
          } catch {
            // AI forecasting is enrichment only
          }
        }

        const pricingCtx: PricingContext = {
          product,
          competitorPrices,
          demandScore,
          inventoryDaysRemaining: daysRemaining,
          seasonalFactor: getSeasonalFactor(),
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
            'medium',
            {
              bot: { totalTicks: newState.priceChangesApplied + newState.inventoryAlertsSent },
              config: state.config as unknown as Record<string, unknown>,
              priceChange: action.currentPrice === 0 ? 0 : ((action.recommendedPrice - action.currentPrice) / action.currentPrice) * 100,
              newMargin: action.recommendedPrice === 0 ? 0 : ((action.recommendedPrice - product.costOfGoods) / action.recommendedPrice) * 100,
            },
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
        const forecast = forecastInventory(product, salesHistory, 14, getSeasonalFactor());

        if (forecast.daysUntilStockout < 14 && product.inventory > 0) {
          newState.inventoryAlertsSent++;
          actions.push(
            `⚠️ ${product.title}: ${forecast.daysUntilStockout} days until stockout — reorder ${forecast.recommendedReorderQty} units`
          );

          // Auto-reorder when below reorder point and autoReorder is enabled
          if (
            state.config.autoReorder &&
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto' &&
            product.inventory <= forecast.reorderPoint
          ) {
            const safetyResult = runSafetyPipeline(
              state.safety,
              `auto_reorder ${product.id}`,
              product.costOfGoods * forecast.recommendedReorderQty,
              'high',
              {
                bot: { totalTicks: newState.priceChangesApplied + newState.inventoryAlertsSent },
                config: state.config as unknown as Record<string, unknown>,
              },
            );

            if (safetyResult.allowed) {
              await adapter.updateInventory(product.id, product.inventory + forecast.recommendedReorderQty);
              actions.push(
                `📦 Auto-reorder placed: ${forecast.recommendedReorderQty} units of ${product.title} (EOQ-based)`
              );
              newState.safety = {
                ...newState.safety,
                budget: recordSpend(newState.safety.budget, product.costOfGoods * forecast.recommendedReorderQty),
              };

              logAuditEntry({
                tenantId: state.safety.tenantId,
                botId: state.safety.botId,
                platform: state.config.platform,
                action: `AUTO_REORDER ${product.id}`,
                result: 'success',
                riskLevel: 'high',
                details: {
                  quantity: forecast.recommendedReorderQty,
                  estimatedCost: product.costOfGoods * forecast.recommendedReorderQty,
                  daysUntilStockout: forecast.daysUntilStockout,
                },
              });
            } else {
              actions.push(`🚫 Auto-reorder blocked by safety: ${safetyResult.reason}`);
            }
          }

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

        // ── Vision AI image quality check ───────
        // Analyze primary product image for quality, background, and category
        const imageUrl = (product as unknown as Record<string, unknown>).imageBase64 as string | undefined;
        if (imageUrl) {
          try {
            const imageAnalysis = await analyzeProductImage(imageUrl, 'image/jpeg');
            if (imageAnalysis) {
              if (imageAnalysis.qualityScore < 60) {
                actions.push(
                  `📸 ${product.title}: image quality ${imageAnalysis.qualityScore}/100 — ${imageAnalysis.backgroundQuality} background`
                );
                score.suggestions.push(`Improve product photo (quality: ${imageAnalysis.qualityScore}/100)`);
              }
              if (imageAnalysis.backgroundQuality === 'cluttered') {
                score.suggestions.push('Use a clean, plain background for product photos');
              }
              logAuditEntry({
                tenantId: state.safety.tenantId,
                botId: state.safety.botId,
                platform: state.config.platform,
                action: `VISION_ANALYSIS ${product.id}`,
                result: 'success',
                riskLevel: 'low',
                details: {
                  qualityScore: imageAnalysis.qualityScore,
                  backgroundQuality: imageAnalysis.backgroundQuality,
                  labels: imageAnalysis.labels.slice(0, 5),
                  dominantColors: imageAnalysis.dominantColors.slice(0, 3),
                },
              });
            }
          } catch {
            // Vision AI is enrichment only
          }
        }

        if (score.overallScore < 70) {
          const optimization = optimizeListing(product);
          actions.push(
            `📝 ${product.title} listing score: ${score.overallScore}/100 — ${score.suggestions.slice(0, 3).join(', ')}`
          );

          if (
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto' &&
            adapter.updateListing
          ) {
            const safetyResult = runSafetyPipeline(
              state.safety,
              `listing_update ${product.id}`,
              0,
              'medium',
            );

            if (safetyResult.allowed) {
              await adapter.updateListing(product.id, {
                title: optimization.optimizedTitle,
                tags: optimization.suggestedTags,
              });
              actions.push(
                `✏️ Optimized listing "${product.title}": ${[...optimization.titleChanges, ...optimization.tagChanges].join(', ')}`
              );

              logAuditEntry({
                tenantId: state.safety.tenantId,
                botId: state.safety.botId,
                platform: state.config.platform,
                action: `LISTING_OPTIMIZE ${product.id}`,
                result: 'success',
                riskLevel: 'medium',
                details: {
                  score: score.overallScore,
                  titleChanges: optimization.titleChanges,
                  tagChanges: optimization.tagChanges,
                },
              });
            }
          }
        }
      }
    }

    // ─── Competitor Monitoring ─────────────────────
    if (state.config.strategies.includes('competitor_monitoring')) {
      for (const product of activeProducts) {
        const competitorPrices = await adapter.getCompetitorPrices(product.id);
        if (competitorPrices.length > 0) {
          const analysis = analyzeCompetitorPrices(product, competitorPrices);

          if (analysis.actionRequired) {
            actions.push(
              `🔍 ${product.title}: ${analysis.recommendation} (pos: ${analysis.pricePosition}, ${analysis.percentFromAvg > 0 ? '+' : ''}${analysis.percentFromAvg}% from avg)`
            );

            // Auto-trigger price adjustment when significantly undercut
            if (
              analysis.percentFromAvg > 15 &&
              state.config.strategies.includes('dynamic_pricing') &&
              !state.config.paperMode &&
              (state.config.autonomyLevel ?? 'manual') === 'auto'
            ) {
              const salesHistory = await adapter.getSalesHistory(product.id, 30);
              const totalSold = salesHistory.reduce((s, d) => s + d.unitsSold, 0);
              const demandScore = Math.min(100, totalSold * 3);
              const velocity = salesHistory.length > 0 ? totalSold / salesHistory.length : 0;
              const daysRemaining = velocity > 0 ? product.inventory / velocity : 9999;

              const repriceAction = calculateDynamicPrice(
                { product, competitorPrices, demandScore, inventoryDaysRemaining: daysRemaining, seasonalFactor: getSeasonalFactor() },
                state.config.maxPriceChangePercent,
                state.config.minMarginPercent,
                state.config.platform,
              );

              if (Math.abs(repriceAction.recommendedPrice - product.price) > 0.01) {
                const safetyResult = runSafetyPipeline(state.safety, `competitor_reprice ${product.id}`, 0, 'medium');
                if (safetyResult.allowed && state.config.autoApplyPricing) {
                  await adapter.updatePrice(product.id, repriceAction.recommendedPrice);
                  newState.priceChangesApplied++;
                  actions.push(`💰 Competitor-triggered reprice: ${product.title} $${product.price} → $${repriceAction.recommendedPrice}`);
                }
              }
            }

            logAuditEntry({
              tenantId: state.safety.tenantId,
              botId: state.safety.botId,
              platform: state.config.platform,
              action: `COMPETITOR_ALERT ${product.id}`,
              result: 'success',
              riskLevel: 'medium',
              details: {
                currentPrice: analysis.currentPrice,
                competitorAvg: analysis.competitorAvg,
                competitorMin: analysis.competitorMin,
                pricePosition: analysis.pricePosition,
                percentFromAvg: analysis.percentFromAvg,
              },
            });
          }

          // Track competitor price trend
          const hist = newState.competitorPriceHistory.get(product.id) ?? [];
          hist.push({ timestamp: Date.now(), prices: competitorPrices });
          if (hist.length > 200) hist.shift();
          newState.competitorPriceHistory.set(product.id, hist);

          // Detect competitor price trend (last 5 snapshots)
          if (hist.length >= 5) {
            const recentAvgs = hist.slice(-5).map(h => h.prices.reduce((a, b) => a + b, 0) / h.prices.length);
            const isDowntrend = recentAvgs.every((v, i) => i === 0 || v <= recentAvgs[i - 1]);
            const isUptrend = recentAvgs.every((v, i) => i === 0 || v >= recentAvgs[i - 1]);
            if (isDowntrend) actions.push(`📉 ${product.title}: competitor prices trending DOWN — race-to-bottom risk`);
            if (isUptrend) actions.push(`📈 ${product.title}: competitor prices trending UP — margin opportunity`);
          }
        }
      }
    }

    // ─── Review Management (LLM-enhanced sentiment) ──
    if (state.config.strategies.includes('review_management')) {
      try {
        const reviews: { id: string; rating: number; text: string }[] = await adapter.getReviews?.() ?? [];
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

          // Act on each review with contextual responses
          for (const rs of sentimentReport.reviewSentiments) {
            const rev = reviews.find(r => r.id === rs.id);
            if (!rev) continue;

            if (rs.score < -0.1) {
              actions.push(`🔻 Negative review (${rev.rating}★): ${rs.keyPhrases.join(', ')}`);

              if (
                !state.config.paperMode &&
                (state.config.autonomyLevel ?? 'manual') === 'auto'
              ) {
                let responseText: string;

                if (state.config.useLLM) {
                  // LLM-personalized response
                  try {
                    const llmResponse = await promptLLM(
                      `You are a professional customer service representative. Write a brief, empathetic response to this negative review of "${activeProducts[0]?.title ?? 'our product'}". Address the specific concerns raised. Keep it under 100 words.\n\nReview: "${rev.text}"`,
                      { maxTokens: 150 },
                    );
                    responseText = llmResponse || generateReviewResponse(rev.text, activeProducts[0]?.title ?? 'our product').suggestedResponse;
                  } catch {
                    responseText = generateReviewResponse(rev.text, activeProducts[0]?.title ?? 'our product').suggestedResponse;
                  }
                } else {
                  // Use keyword-based contextual response generation
                  const reviewResp = generateReviewResponse(rev.text, activeProducts[0]?.title ?? 'our product');
                  responseText = reviewResp.suggestedResponse;
                }

                const safetyResult = runSafetyPipeline(
                  state.safety,
                  `review_response ${rev.id}`,
                  0,
                  'medium',
                );

                if (safetyResult.allowed) {
                  await adapter.respondToReview?.(rev.id, responseText);
                  actions.push(`↩️ Responded to negative review ${rev.id} (personalized)`);
                }
              }
            } else if (rs.score > 0.3) {
              // Respond to positive reviews too (builds community)
              if (
                !state.config.paperMode &&
                (state.config.autonomyLevel ?? 'manual') === 'auto'
              ) {
                const reviewResp = generateReviewResponse(rev.text, activeProducts[0]?.title ?? 'our product');
                await adapter.respondToReview?.(rev.id, reviewResp.suggestedResponse);
                actions.push(`💚 Thanked positive reviewer ${rev.id}`);
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
              reviewsProcessed: reviews.length,
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
