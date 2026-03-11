import type {
  SocialPlatform,
  ScheduledPost,
  AudienceMetrics,
  TrendSignal,
  SocialBotConfig,
  TickResult,
  ContentFormat,
} from '../index';
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
  type ContentSlot,
} from './strategies.js';

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
          state.config.contentApprovalRequired ? 'high' : 'low'
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
            : selectOptimalHashtags(metrics, slot.platform);

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
    if (state.config.strategies.includes('trend_detection')) {
      const trends = await adapter.getTrending();
      const brandKeywords = state.config.sensitiveTopicKeywords.length > 0
        ? state.config.sensitiveTopicKeywords
        : ['technology', 'ai', 'automation', 'business'];

      for (const trend of trends.slice(0, 10)) {
        if (newState.trendsActedOn.includes(trend.hashtag)) continue;

        const relevance = scoreTrendRelevance(trend, brandKeywords);
        if (relevance.actionable) {
          actions.push(`🔥 Trending: ${trend.topic} (${trend.hashtag}) — relevance: ${(relevance.score * 100).toFixed(0)}%`);
          newState.trendsActedOn = [...newState.trendsActedOn, trend.hashtag].slice(-50);

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
    }

    // ─── Engagement Automation ─────────────────────
    if (state.config.strategies.includes('engagement_automation')) {
      if (metrics.engagementRate < state.config.maxEngagementsPerHour) {
        actions.push(`📣 Engagement low (${metrics.engagementRate.toFixed(2)}%) — running boost routine`);
        if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto' && adapter.engageWith) {
          // attempt to like the 3 most recent posts
          const recentPosts = scheduledPosts.slice(-3);
          for (const p of recentPosts) {
            await adapter.engageWith(p.id, 'like');
          }
          newState.engagementsToday += recentPosts.length;
          actions.push(`💬 performed ${recentPosts.length} likes`);
        }
      }
    }

    // ─── Hashtag Optimization ───────────────────────
    if (state.config.strategies.includes('hashtag_optimization')) {
      const topHashtags = metrics.topHashtags.slice(0, 5).join(', ');
      actions.push(`#️⃣ Top hashtags: ${topHashtags}`);
    }

    // ─── Comment Monitoring & Response ───────────────
    if (state.config.strategies.includes('comment_monitoring')) {
      if (adapter.getComments) {
        const comments = await adapter.getComments();
        for (const c of comments) {
          if (/\?/i.test(c.text)) {
            actions.push(`🗨️ Question detected: ${c.text}`);
            if (!state.config.paperMode && (state.config.autonomyLevel ?? 'manual') === 'auto' && adapter.replyToComment) {
              await adapter.replyToComment(c.commentId, 'Thanks for the question! We will follow up.');
              actions.push(`Reply sent to comment ${c.commentId}`);
            }
          }
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
