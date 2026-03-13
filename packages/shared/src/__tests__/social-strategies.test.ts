import { describe, it, expect } from 'vitest';
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
} from '../social/strategies';
import type { ScheduledPost, AudienceMetrics, TrendSignal, SocialPlatform } from '../index';

describe('Social Strategies', () => {
  describe('SOCIAL_PLATFORM_STRATEGIES', () => {
    it('covers all 5 social platforms', () => {
      const platforms = SOCIAL_PLATFORM_STRATEGIES.map((s) => s.platform);
      expect(platforms).toContain('x');
      expect(platforms).toContain('tiktok');
      expect(platforms).toContain('instagram');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('linkedin');
      expect(platforms).toHaveLength(5);
    });

    it('each platform has distinct strategies', () => {
      const x = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === 'x')!;
      const tiktok = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === 'tiktok')!;
      expect(x.bestFormats).not.toEqual(tiktok.bestFormats);
      expect(x.hashtagStrategy).not.toBe(tiktok.hashtagStrategy);
    });

    it('every platform has API limits', () => {
      for (const strategy of SOCIAL_PLATFORM_STRATEGIES) {
        expect(strategy.apiLimits.postsPerDay).toBeGreaterThan(0);
        expect(strategy.apiLimits.engagementsPerHour).toBeGreaterThan(0);
      }
    });
  });

  describe('generateContentCalendar', () => {
    it('generates slots for a full week', () => {
      const calendar = generateContentCalendar('x', 3);
      expect(calendar.length).toBe(7 * 3); // 7 days * 3 posts
    });

    it('respects API limits', () => {
      // X allows 50 posts/day, but requesting 100 should be capped
      const calendar = generateContentCalendar('x', 100);
      const slotsPerDay = calendar.length / 7;
      expect(slotsPerDay).toBeLessThanOrEqual(50);
    });

    it('returns empty for unknown platform', () => {
      const calendar = generateContentCalendar('unknown' as SocialPlatform, 3);
      expect(calendar).toHaveLength(0);
    });

    it('uses peak hours and best formats from strategy', () => {
      const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === 'tiktok')!;
      const calendar = generateContentCalendar('tiktok', 2);
      const hours = calendar.map((s) => s.hourUtc);
      for (const hour of hours) {
        expect(strategy.peakEngagementHoursUtc).toContain(hour);
      }
    });
  });

  describe('analyzeEngagement', () => {
    const mockPost: ScheduledPost = {
      id: 'post-1',
      platform: 'instagram',
      content: 'Check out our new product!',
      format: 'reel',
      hashtags: ['product', 'launch'],
      scheduledAt: Date.now(),
      status: 'scheduled',
    };

    const mockMetrics: AudienceMetrics = {
      platform: 'instagram',
      followers: 10000,
      followersGrowthPercent: 2.5,
      engagementRate: 3.5,
      avgReach: 5000,
      bestPostingHours: [11, 17],
      topHashtags: ['instagood', 'productlaunch', 'new', 'brand', 'shop'],
      audienceTimezone: 'America/New_York',
    };

    it('returns engagement analysis with expected fields', () => {
      const analysis = analyzeEngagement(mockPost, mockMetrics);
      expect(analysis.post).toBe(mockPost);
      expect(analysis.expectedEngagementRate).toBeGreaterThan(0);
      expect(analysis.bestTimeToPost).toBe(11); // first best hour
      expect(analysis.hashtagRecommendations.length).toBeGreaterThan(0);
    });

    it('reels have higher expected engagement than text', () => {
      const reelPost = { ...mockPost, format: 'reel' as const };
      const textPost = { ...mockPost, format: 'text' as const };
      const reelAnalysis = analyzeEngagement(reelPost, mockMetrics);
      const textAnalysis = analyzeEngagement(textPost, mockMetrics);
      expect(reelAnalysis.expectedEngagementRate).toBeGreaterThan(textAnalysis.expectedEngagementRate);
    });
  });

  describe('scoreTrendRelevance', () => {
    const mockTrend: TrendSignal = {
      platform: 'x',
      topic: 'AI trading bots',
      hashtag: '#AITrading',
      volume: 50000,
      velocityPercent: 80,
      relevanceScore: 0.5,
      detectedAt: Date.now(),
    };

    it('boosts score when brand keywords match', () => {
      const result = scoreTrendRelevance(mockTrend, ['trading', 'bots']);
      expect(result.score).toBeGreaterThan(mockTrend.relevanceScore);
      expect(result.relevant).toBe(true);
    });

    it('marks as actionable when velocity is high and relevant', () => {
      const result = scoreTrendRelevance(mockTrend, ['trading']);
      expect(result.actionable).toBe(true);
    });

    it('marks as not relevant when score below threshold', () => {
      const lowRelevanceTrend = { ...mockTrend, relevanceScore: 0.1 };
      const result = scoreTrendRelevance(lowRelevanceTrend, ['unrelated'], 0.5);
      expect(result.relevant).toBe(false);
    });
  });

  describe('optimalPostTimes', () => {
    it('returns audience-specific times when available', () => {
      const audiences: AudienceMetrics[] = [
        {
          platform: 'x',
          followers: 5000,
          followersGrowthPercent: 1,
          engagementRate: 2,
          avgReach: 2000,
          bestPostingHours: [10, 15, 20],
          topHashtags: [],
          audienceTimezone: 'UTC',
        },
      ];
      const times = optimalPostTimes(audiences, 'x');
      expect(times).toEqual([10, 15, 20]);
    });

    it('falls back to platform defaults', () => {
      const times = optimalPostTimes([], 'linkedin');
      const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === 'linkedin')!;
      expect(times).toEqual(strategy.peakEngagementHoursUtc);
    });
  });

  // ─── Hashtag Optimization ─────────────────────────────────
  describe('selectOptimalHashtags', () => {
    const mockMetrics: AudienceMetrics = {
      platform: 'instagram',
      followers: 10000,
      followersGrowthPercent: 2.5,
      engagementRate: 3.5,
      avgReach: 5000,
      bestPostingHours: [11, 17],
      topHashtags: ['fashion', 'style', 'outfit', 'trendy', 'ootd', 'lookbook', 'streetwear'],
      audienceTimezone: 'America/New_York',
    };

    it('returns scored hashtags with categories', () => {
      const result = selectOptimalHashtags(mockMetrics, 'instagram');
      expect(result.length).toBeGreaterThan(0);
      for (const h of result) {
        expect(h.tag).toMatch(/^#/);
        expect(h.score).toBeGreaterThanOrEqual(0);
        expect(['broad', 'niche', 'trending', 'brand']).toContain(h.category);
      }
    });

    it('includes trending hashtags when provided', () => {
      const result = selectOptimalHashtags(mockMetrics, 'instagram', 5, ['#trending2024'], []);
      const tags = result.map(r => r.tag);
      expect(tags).toContain('#trending2024');
    });

    it('includes brand keywords as branded hashtags', () => {
      const result = selectOptimalHashtags(mockMetrics, 'instagram', 10, [], ['BeastBots']);
      const brandTags = result.filter(r => r.category === 'brand');
      expect(brandTags.length).toBeGreaterThan(0);
    });

    it('respects platform-specific count defaults', () => {
      const xResult = selectOptimalHashtags(mockMetrics, 'x');
      const igResult = selectOptimalHashtags(mockMetrics, 'instagram');
      expect(xResult.length).toBeLessThanOrEqual(igResult.length);
    });

    it('mixes categories for diversity', () => {
      const result = selectOptimalHashtags(
        mockMetrics, 'instagram', 10,
        ['#summer', '#beach'],
        ['BrandName'],
      );
      const categories = new Set(result.map(r => r.category));
      expect(categories.size).toBeGreaterThanOrEqual(2); // at least 2 different categories
    });

    it('handles empty metrics hashtags', () => {
      const emptyMetrics = { ...mockMetrics, topHashtags: [] };
      const result = selectOptimalHashtags(emptyMetrics, 'x', 3, ['#tech']);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ─── Trend Post Generation ────────────────────────────────
  describe('generateTrendPost', () => {
    const mockTrend: TrendSignal = {
      platform: 'x',
      topic: 'AI Revolution',
      hashtag: '#AIRevolution',
      volume: 100000,
      velocityPercent: 120,
      relevanceScore: 0.8,
      detectedAt: Date.now(),
    };

    it('generates platform-appropriate content for X', () => {
      const post = generateTrendPost(mockTrend, 'x', 'an AI automation company');
      expect(post.format).toBe('thread');
      expect(post.suggestedContent).toContain('AI Revolution');
      expect(post.urgency).toBe('immediate'); // velocity > 100
    });

    it('generates reel format for Instagram', () => {
      const post = generateTrendPost(mockTrend, 'instagram', 'a tech brand');
      expect(post.format).toBe('reel');
    });

    it('generates professional content for LinkedIn', () => {
      const post = generateTrendPost(mockTrend, 'linkedin', 'a B2B SaaS company');
      expect(post.format).toBe('text');
      expect(post.suggestedContent).toContain('reshaping');
    });

    it('determines urgency based on velocity', () => {
      const slow = { ...mockTrend, velocityPercent: 30 };
      const medium = { ...mockTrend, velocityPercent: 70 };
      const fast = { ...mockTrend, velocityPercent: 150 };

      expect(generateTrendPost(slow, 'x', 'brand').urgency).toBe('today');
      expect(generateTrendPost(medium, 'x', 'brand').urgency).toBe('within_hours');
      expect(generateTrendPost(fast, 'x', 'brand').urgency).toBe('immediate');
    });

    it('includes trend hashtag in content', () => {
      const post = generateTrendPost(mockTrend, 'x', 'a brand');
      expect(post.suggestedContent).toContain('#AIRevolution');
    });
  });

  // ─── Post Performance Analysis ────────────────────────────
  describe('analyzePostPerformance', () => {
    const mockMetrics: AudienceMetrics = {
      platform: 'instagram',
      followers: 10000,
      followersGrowthPercent: 2.5,
      engagementRate: 3.5,
      avgReach: 5000,
      bestPostingHours: [11, 17],
      topHashtags: ['fashion', 'style'],
      audienceTimezone: 'America/New_York',
    };

    const mockPosts: ScheduledPost[] = [
      { id: '1', platform: 'instagram', content: 'test', format: 'reel', hashtags: [], scheduledAt: Date.now(), status: 'posted' },
      { id: '2', platform: 'instagram', content: 'test', format: 'image', hashtags: [], scheduledAt: Date.now(), status: 'posted' },
      { id: '3', platform: 'instagram', content: 'test', format: 'text', hashtags: [], scheduledAt: Date.now(), status: 'posted' },
    ];

    it('identifies best format', () => {
      const insight = analyzePostPerformance(mockPosts, mockMetrics, 'instagram');
      expect(insight.bestFormat).toBe('reel'); // reels have highest multiplier
    });

    it('returns format breakdown sorted by engagement', () => {
      const insight = analyzePostPerformance(mockPosts, mockMetrics, 'instagram');
      expect(insight.formatBreakdown[0].avgEngagement).toBeGreaterThanOrEqual(insight.formatBreakdown[insight.formatBreakdown.length - 1].avgEngagement);
    });

    it('generates actionable recommendations', () => {
      const insight = analyzePostPerformance(mockPosts, mockMetrics, 'instagram');
      expect(insight.recommendations.length).toBeGreaterThan(0);
    });

    it('suggests reels for Instagram if missing', () => {
      const postsNoReels: ScheduledPost[] = [
        { id: '1', platform: 'instagram', content: 'test', format: 'image', hashtags: [], scheduledAt: Date.now(), status: 'posted' },
      ];
      const insight = analyzePostPerformance(postsNoReels, mockMetrics, 'instagram');
      expect(insight.recommendations.some(r => r.includes('Reel'))).toBe(true);
    });

    it('suggests threads for X if missing', () => {
      const postsNoThreads: ScheduledPost[] = [
        { id: '1', platform: 'x', content: 'test', format: 'text', hashtags: [], scheduledAt: Date.now(), status: 'posted' },
      ];
      const xMetrics = { ...mockMetrics, platform: 'x' as SocialPlatform };
      const insight = analyzePostPerformance(postsNoThreads, xMetrics, 'x');
      expect(insight.recommendations.some(r => r.includes('thread'))).toBe(true);
    });

    it('returns best hour from metrics', () => {
      const insight = analyzePostPerformance(mockPosts, mockMetrics, 'instagram');
      expect(insight.bestHour).toBe(11);
    });
  });

  // ─── Comment Intent Classification ────────────────────────
  describe('classifyCommentIntent', () => {
    it('detects questions', () => {
      expect(classifyCommentIntent('How does this work?').intent).toBe('question');
      expect(classifyCommentIntent('When is the sale?').intent).toBe('question');
    });

    it('detects complaints', () => {
      expect(classifyCommentIntent('This product is terrible and broken').intent).toBe('complaint');
      expect(classifyCommentIntent('I want a refund immediately').intent).toBe('complaint');
    });

    it('detects praise', () => {
      expect(classifyCommentIntent('I love this product so much!').intent).toBe('praise');
      expect(classifyCommentIntent('Best purchase ever, amazing quality').intent).toBe('praise');
    });

    it('detects spam', () => {
      expect(classifyCommentIntent('Check my bio for free money!').intent).toBe('spam');
      expect(classifyCommentIntent('Click here to subscribe!').intent).toBe('spam');
    });

    it('detects purchase interest', () => {
      expect(classifyCommentIntent('How much does this cost?').intent).toBe('purchase_interest');
      expect(classifyCommentIntent('Where to buy this?').intent).toBe('purchase_interest');
      expect(classifyCommentIntent('Is this available in stock?').intent).toBe('purchase_interest');
    });

    it('returns neutral for generic comments', () => {
      expect(classifyCommentIntent('Cool photo').intent).toBe('neutral');
    });

    it('returns confidence scores', () => {
      const result = classifyCommentIntent('This is terrible!');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ─── Comment Reply Generation ─────────────────────────────
  describe('generateCommentReply', () => {
    it('generates reply for questions', () => {
      const reply = generateCommentReply('How does it work?', 'question', 'friendly', 'our product');
      expect(reply).toContain('question');
    });

    it('generates empathetic reply for complaints', () => {
      const reply = generateCommentReply('This broke immediately', 'complaint', 'professional', 'widget');
      expect(reply).toContain('sorry');
    });

    it('generates thank you for praise', () => {
      const reply = generateCommentReply('Love this!', 'praise', 'casual');
      expect(reply).toContain('Thank you');
    });

    it('generates purchase reply with CTA', () => {
      const reply = generateCommentReply('How much?', 'purchase_interest', 'professional', 'headphones');
      expect(reply).toContain('interest');
    });

    it('returns empty string for spam', () => {
      const reply = generateCommentReply('Click my bio!', 'spam', 'professional');
      expect(reply).toBe('');
    });

    it('generates neutral acknowledgment', () => {
      const reply = generateCommentReply('Nice', 'neutral', 'casual');
      expect(reply).toBeTruthy();
    });
  });
});
