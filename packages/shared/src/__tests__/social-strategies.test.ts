import { describe, it, expect } from 'vitest';
import {
  SOCIAL_PLATFORM_STRATEGIES,
  generateContentCalendar,
  analyzeEngagement,
  scoreTrendRelevance,
  optimalPostTimes,
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
});
