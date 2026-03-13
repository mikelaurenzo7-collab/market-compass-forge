import type {
  SocialPlatform,
  ScheduledPost,
  AudienceMetrics,
  TrendSignal,
  SocialBotConfig,
  TickResult,
  ContentFormat,
} from '../index.js';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess } from '../safety.js';
import { promptLLM, promptWithTemplate } from '../llm.js';
import {
  SOCIAL_CONTENT_TEMPLATE,
} from '../prompts.js';
import {
  SOCIAL_PLATFORM_STRATEGIES,
  generateContentCalendar,
  analyzeEngagement,
  scoreTrendRelevance,
  optimalPostTimes,
  selectOptimalHashtags,
  generateTrendPost,
  analyzePostPerformance,
  classifyCommentIntent,
  generateCommentReply,
  type ContentSlot,
} from './strategies.js';
import { fetchGoogleTrends, trendDemandSignal, type GoogleTrend } from '../market-intelligence.js';

// ─── Social Adapter Interface ─────────────────────────────────

export interface SocialAdapter {
  platform: SocialPlatform;
  publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }>;
  getMetrics(): Promise<AudienceMetrics>;
  getTrending(): Promise<TrendSignal[]>;
  getScheduledPosts(): Promise<ScheduledPost[]>;
  getPostsToday(): Promise<number>;
  engageWith?(postId: string, action: 'like' | 'reply' | 'repost', content?: string): Promise<{ success: boolean }>;
  getComments?(): Promise<{ commentId: string; text: string; sentiment?: string }[]>;
  replyToComment?(commentId: string, text: string): Promise<{ success: boolean }>;
}

// ─── Social Engine State ──────────────────────────────────────

export interface SocialEngineState {
  config: SocialBotConfig;
  safety: SafetyContext;
  contentCalendar: ContentSlot[];
  lastCalendarGeneration: number;
  postsPublishedToday: number;
  engagementsToday: number;
  trendsActedOn: string[];
}

export function createSocialEngineState(
  config: SocialBotConfig,
  safety: SafetyContext
): SocialEngineState {
  return {
    config,
    safety,
    contentCalendar: generateContentCalendar(config.platform, config.maxPostsPerDay),
    lastCalendarGeneration: Date.now(),
    postsPublishedToday: 0,
    engagementsToday: 0,
    trendsActedOn: [],
  };
}

// ─── Social Engine Tick ───────────────────────────────────────

export async function executeSocialTick(
  state: SocialEngineState,
  adapter: SocialAdapter
): Promise<{ result: TickResult; newState: SocialEngineState }> {
  const startTime = Date.now();
  let newState = { ...state };

  try {
    const actions: string[] = [];
    const [metrics, postsToday, scheduledPosts] = await Promise.all([
      adapter.getMetrics(),
      adapter.getPostsToday(),
      adapter.getScheduledPosts(),
    ]);

    newState.postsPublishedToday = postsToday;

    // ─── Daily Calendar Refresh ──────────────────
    const calendarAgeMs = Date.now() - newState.lastCalendarGeneration;
    if (calendarAgeMs > 24 * 60 * 60 * 1000) {
      newState.contentCalendar = generateContentCalendar(state.config.platform, state.config.maxPostsPerDay);
      newState.lastCalendarGeneration = Date.now();
      newState.postsPublishedToday = 0; // reset daily counter
      newState.engagementsToday = 0;
    }

    // ─── Content Calendar ─────────────────────────
    if (state.config.strategies.includes('content_calendar')) {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const currentHour = now.getUTCHours();

      // Find slots for current time window
      const dueSlots = newState.contentCalendar.filter(
        (slot) => slot.dayOfWeek === dayOfWeek && slot.hourUtc === currentHour
      );

      for (const slot of dueSlots) {
        if (postsToday >= state.config.maxPostsPerDay) {
          actions.push(`Daily post limit reached (${postsToday}/${state.config.maxPostsPerDay})`);
          break;
        }

        const safetyResult = runSafetyPipeline(
          state.safety,
          `publish_${slot.format}_${slot.platform}`,
          0,
          state.config.contentApprovalRequired ? 'high' : 'low',
          {
            bot: { totalTicks: newState.postsPublishedToday + newState.engagementsToday },
            config: state.config as unknown as Record<string, unknown>,
            dailyPosts: postsToday,
            content: { matchesSensitiveKeywords: false },
          },
        );

        if (!safetyResult.allowed) {
          actions.push(`Post blocked: ${safetyResult.reason}`);
          continue;
        }

        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto') {
          // build content (LLM template if enabled)
          let contentText = `[${slot.pillar}] Scheduled content for ${slot.format} format`;
          let suggestedHashtags: string[] = [];
          if (state.config.useLLM) {
            try {
              const { result } = await promptWithTemplate(
                SOCIAL_CONTENT_TEMPLATE,
                {
                  platform: slot.platform,
                  format: slot.format,
                  pillar: slot.pillar,
                  brandVoice: state.config.brandVoice || 'professional and engaging',
                  brandDescription: state.config.brandDescription || '',
                  recentTrends: newState.trendsActedOn.slice(-5),
                  audienceSize: metrics.followers,
                  engagementRate: metrics.engagementRate,
                },
              );
              if (result) {
                contentText = result.content;
                suggestedHashtags = result.suggestedHashtags;
              }
            } catch (e) {
              console.warn('LLM content generation failed, using template');
            }
          }
          // apply tiny platform-specific tweaks
          if (slot.platform === 'x' && slot.format === 'thread') {
            contentText = '🧵 ' + contentText;
          }
          if (slot.platform === 'tiktok' && slot.format === 'video') {
            contentText = contentText + ' #ForYou';
          }
          const hashtags = suggestedHashtags.length > 0
            ? suggestedHashtags
            : selectOptimalHashtags(metrics, slot.platform).map(h => h.tag);

          const post: ScheduledPost = {
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            platform: slot.platform,
            content: contentText,
            format: slot.format,
            hashtags,
            scheduledAt: Date.now(),
            status: 'scheduled',
          };

          const result = await adapter.publishPost(post);
          if (result.success) {
            newState.postsPublishedToday++;
            actions.push(`Published ${slot.format} on ${slot.platform}: ${slot.pillar}`);

            logAuditEntry({
              tenantId: state.safety.tenantId,
              botId: state.safety.botId,
              platform: state.config.platform,
              action: `PUBLISH_${slot.format.toUpperCase()}`,
              result: 'success',
              riskLevel: 'low',
              details: { postId: result.postId, pillar: slot.pillar },
            });
          }
        } else {
          actions.push(`[PAPER] Would publish ${slot.format}: ${slot.pillar}`);
        }
      }
    }

    // ─── Trend Detection ──────────────────────────
    if (state.config.strategies.includes('trend_detection') || state.config.strategies.includes('trend_reactive')) {
      const trends = await adapter.getTrending();
      const brandKeywords = state.config.sensitiveTopicKeywords.length > 0
        ? state.config.sensitiveTopicKeywords
        : ['technology', 'ai', 'automation', 'business'];

      // ── Google Trends enrichment ──────────────
      // Fetch real-time search interest for brand-relevant keywords
      let googleTrendData: GoogleTrend[] = [];
      try {
        googleTrendData = await fetchGoogleTrends(brandKeywords.slice(0, 5));
        if (googleTrendData.length > 0) {
          const breakouts = googleTrendData.filter(t => trendDemandSignal(t) >= 1.5);
          for (const bo of breakouts) {
            actions.push(`🔎 Google Trends breakout: "${bo.keyword}" — ${bo.interestChange7d > 0 ? '+' : ''}${bo.interestChange7d.toFixed(0)}% (7d)`);
          }
        }
      } catch {
        // Google Trends is enrichment—never blocks
      }

      for (const trend of trends.slice(0, 10)) {
        if (newState.trendsActedOn.includes(trend.hashtag)) continue;

        const relevance = scoreTrendRelevance(trend, brandKeywords);
        if (relevance.actionable) {
          actions.push(`🔥 Trending: ${trend.topic} (${trend.hashtag}) — relevance: ${(relevance.score * 100).toFixed(0)}%`);
          newState.trendsActedOn = [...newState.trendsActedOn, trend.hashtag].slice(-50);

          // Auto-generate and publish trend-reactive content
          if (
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto' &&
            newState.postsPublishedToday < state.config.maxPostsPerDay
          ) {
            const trendPost = generateTrendPost(
              trend,
              state.config.platform,
              state.config.brandDescription || 'our brand',
              state.config.brandVoice,
            );

            let contentText = trendPost.suggestedContent;

            // Enhance with LLM if available
            if (state.config.useLLM) {
              try {
                const { result } = await promptWithTemplate(
                  SOCIAL_CONTENT_TEMPLATE,
                  {
                    platform: state.config.platform,
                    format: trendPost.format,
                    pillar: `Trending: ${trend.topic}`,
                    brandVoice: state.config.brandVoice || 'professional and engaging',
                    brandDescription: state.config.brandDescription || '',
                    recentTrends: [trend.topic],
                    audienceSize: metrics.followers,
                    engagementRate: metrics.engagementRate,
                  },
                );
                if (result?.content) contentText = result.content;
              } catch { /* fall back to template */ }
            }

            const safetyResult = runSafetyPipeline(
              state.safety,
              `trend_post_${trend.hashtag}`,
              0,
              'medium',
              {
                bot: { totalTicks: newState.postsPublishedToday + newState.engagementsToday },
                config: state.config as unknown as Record<string, unknown>,
                dailyPosts: newState.postsPublishedToday,
                content: {
                  matchesSensitiveKeywords: state.config.sensitiveTopicKeywords.some((keyword) => contentText.toLowerCase().includes(keyword.toLowerCase())),
                },
              },
            );

            if (safetyResult.allowed) {
              const hashtagResults = selectOptimalHashtags(
                metrics, state.config.platform, undefined,
                [trend.hashtag],
                brandKeywords,
              );

              const post: ScheduledPost = {
                id: `trend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                platform: state.config.platform,
                content: contentText,
                format: trendPost.format,
                hashtags: hashtagResults.map(h => h.tag),
                scheduledAt: Date.now(),
                status: 'scheduled',
              };

              const publishResult = await adapter.publishPost(post);
              if (publishResult.success) {
                newState.postsPublishedToday++;
                actions.push(`🚀 Trend-reactive post published: ${trend.topic} (${trendPost.urgency} urgency)`);
              }
            }
          } else if (state.config.paperMode) {
            const trendPost = generateTrendPost(trend, state.config.platform, state.config.brandDescription || 'our brand');
            actions.push(`[PAPER] Would trend-post: ${trendPost.suggestedContent.slice(0, 80)}...`);
          }

          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: `TREND_DETECTED`,
            result: 'success',
            riskLevel: 'low',
            details: { trend, relevance },
          });
        }
      }
    }

    // ─── Audience Analytics ───────────────────────
    if (state.config.strategies.includes('audience_analytics')) {
      const bestTimes = optimalPostTimes([metrics], state.config.platform);
      actions.push(
        `📊 Followers: ${metrics.followers} (${metrics.followersGrowthPercent > 0 ? '+' : ''}${metrics.followersGrowthPercent.toFixed(1)}%) | Engagement: ${metrics.engagementRate.toFixed(2)}% | Best times: ${bestTimes.join(', ')}h UTC`
      );

      // Run post performance analysis for actionable recommendations
      if (scheduledPosts.length > 0) {
        const perfInsight = analyzePostPerformance(scheduledPosts, metrics, state.config.platform);
        for (const rec of perfInsight.recommendations.slice(0, 3)) {
          actions.push(`💡 ${rec}`);
        }
        actions.push(
          `📈 Best format: ${perfInsight.bestFormat} | Best hour: ${perfInsight.bestHour}h UTC | Best pillar: ${perfInsight.bestPillar}`
        );

        logAuditEntry({
          tenantId: state.safety.tenantId,
          botId: state.safety.botId,
          platform: state.config.platform,
          action: 'AUDIENCE_ANALYTICS',
          result: 'success',
          riskLevel: 'low',
          details: {
            followers: metrics.followers,
            engagementRate: metrics.engagementRate,
            bestFormat: perfInsight.bestFormat,
            recommendations: perfInsight.recommendations,
          },
        });
      }
    }

    // ─── Engagement Automation ─────────────────────
    if (state.config.strategies.includes('engagement_automation')) {
      const strategy = SOCIAL_PLATFORM_STRATEGIES.find(s => s.platform === state.config.platform);
      const hourlyLimit = state.config.maxEngagementsPerHour;
      const remainingEngagements = hourlyLimit - (newState.engagementsToday % hourlyLimit);

      if (remainingEngagements > 0 && !state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto' && adapter.engageWith) {
        // Strategy 1: Engage with trending content in our niche
        try {
          const trends = await adapter.getTrending();
          const relevantTrends = trends.filter(t => {
            const brandKeywords = state.config.sensitiveTopicKeywords.length > 0
              ? state.config.sensitiveTopicKeywords
              : ['technology', 'ai', 'automation', 'business'];
            return scoreTrendRelevance(t, brandKeywords).relevant;
          }).slice(0, 3);

          let engagementCount = 0;

          // Like + reply to trending posts (varied actions)
          for (const trend of relevantTrends) {
            if (engagementCount >= remainingEngagements) break;

            const safetyResult = runSafetyPipeline(
              state.safety,
              `engage_trend_${trend.hashtag}`,
              0,
              'low',
            );

            if (safetyResult.allowed) {
              // Alternate between like and repost for variety
              const action = engagementCount % 3 === 0 ? 'repost' : 'like';
              await adapter.engageWith(trend.hashtag, action);
              engagementCount++;
            }
          }

          // Strategy 2: Engage with recent scheduled/published posts for algorithm boost
          const recentPosts = scheduledPosts.filter(p => p.status === 'posted' || p.status === 'scheduled').slice(-5);
          for (const p of recentPosts) {
            if (engagementCount >= remainingEngagements) break;
            // Engagement within first hour of posting boosts algorithm visibility
            await adapter.engageWith(p.id, 'like');
            engagementCount++;
          }

          newState.engagementsToday += engagementCount;
          if (engagementCount > 0) {
            actions.push(`💬 Engagement boost: ${engagementCount} actions (likes/reposts) across trends & recent posts`);
          }
        } catch {
          actions.push('⚠️ Engagement automation encountered an error');
        }
      } else if (state.config.paperMode) {
        actions.push(`[PAPER] Would perform engagement automation (${remainingEngagements} actions available)`);
      }

      // Report engagement health
      const engagementHealth = metrics.engagementRate >= 3 ? '🟢 healthy' :
                               metrics.engagementRate >= 1 ? '🟡 moderate' : '🔴 needs attention';
      actions.push(`📣 Engagement health: ${engagementHealth} (${metrics.engagementRate.toFixed(2)}%)`);
    }

    // ─── Hashtag Optimization ───────────────────────
    if (state.config.strategies.includes('hashtag_optimization')) {
      const trends = await adapter.getTrending();
      const trendingHashtags = trends.slice(0, 5).map(t => t.hashtag);
      const brandKeywords = state.config.sensitiveTopicKeywords.length > 0
        ? state.config.sensitiveTopicKeywords
        : [];

      const optimizedHashtags = selectOptimalHashtags(
        metrics,
        state.config.platform,
        undefined,
        trendingHashtags,
        brandKeywords,
      );

      const categoryBreakdown = optimizedHashtags.reduce((acc, h) => {
        acc[h.category] = (acc[h.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      actions.push(
        `#️⃣ Optimized hashtags (${optimizedHashtags.length}): ${optimizedHashtags.map(h => h.tag).join(' ')} | Mix: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k}:${v}`).join(', ')}`
      );

      logAuditEntry({
        tenantId: state.safety.tenantId,
        botId: state.safety.botId,
        platform: state.config.platform,
        action: 'HASHTAG_OPTIMIZATION',
        result: 'success',
        riskLevel: 'low',
        details: {
          hashtags: optimizedHashtags,
          trendingUsed: trendingHashtags.length,
        },
      });
    }

    // ─── Comment Monitoring & Response ───────────────
    if (state.config.strategies.includes('comment_monitoring')) {
      if (adapter.getComments) {
        const comments = await adapter.getComments();

        for (const c of comments) {
          const classification = classifyCommentIntent(c.text);

          // Skip spam — don't respond
          if (classification.intent === 'spam') {
            actions.push(`🚫 Spam detected: "${c.text.slice(0, 40)}..." — skipped`);
            continue;
          }

          // Log high-priority comments
          if (classification.intent === 'complaint') {
            actions.push(`⚠️ Complaint detected (${(classification.confidence * 100).toFixed(0)}%): "${c.text.slice(0, 60)}..."`);
          } else if (classification.intent === 'purchase_interest') {
            actions.push(`🛒 Purchase interest: "${c.text.slice(0, 60)}..."`);
          } else if (classification.intent === 'question') {
            actions.push(`❓ Question: "${c.text.slice(0, 60)}..."`);
          }

          // Auto-reply with contextual responses
          if (
            !state.config.paperMode &&
            (state.config.autonomyLevel ?? 'manual') === 'auto' &&
            adapter.replyToComment &&
            classification.intent !== 'neutral' // only reply to meaningful interactions
          ) {
            let replyText: string;

            if (state.config.useLLM && (classification.intent === 'question' || classification.intent === 'complaint')) {
              // Use LLM for questions and complaints (higher stakes)
              try {
                const llmReply = await promptLLM(
                  `You are a social media manager for ${state.config.brandDescription || 'a brand'}. Respond to this ${classification.intent} comment in a ${state.config.brandVoice || 'friendly and professional'} tone. Keep it under 50 words. Be helpful and on-brand.\n\nComment: "${c.text}"`,
                  { maxTokens: 80 },
                );
                replyText = llmReply || generateCommentReply(
                  c.text, classification.intent,
                  state.config.brandVoice || 'professional',
                  state.config.brandDescription,
                );
              } catch {
                replyText = generateCommentReply(
                  c.text, classification.intent,
                  state.config.brandVoice || 'professional',
                  state.config.brandDescription,
                );
              }
            } else {
              replyText = generateCommentReply(
                c.text, classification.intent,
                state.config.brandVoice || 'professional',
                state.config.brandDescription,
              );
            }

            if (replyText) {
              const safetyResult = runSafetyPipeline(
                state.safety,
                `comment_reply_${c.commentId}`,
                0,
                classification.intent === 'complaint' ? 'medium' : 'low',
              );

              if (safetyResult.allowed) {
                await adapter.replyToComment(c.commentId, replyText);
                newState.engagementsToday++;
                actions.push(`↩️ Replied to ${classification.intent} (${c.commentId})`);
              }
            }
          }
        }

        if (comments.length > 0) {
          const intentSummary = comments.reduce((acc, c) => {
            const intent = classifyCommentIntent(c.text).intent;
            acc[intent] = (acc[intent] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: 'COMMENT_MONITORING',
            result: 'success',
            riskLevel: 'low',
            details: {
              commentsProcessed: comments.length,
              intentBreakdown: intentSummary,
            },
          });
        }
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
          postsPublished: newState.postsPublishedToday - state.postsPublishedToday,
          trendsDetected: newState.trendsActedOn.length - state.trendsActedOn.length,
          engagementRate: metrics.engagementRate,
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
      action: 'social_tick_error',
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
