import type {
  SocialPlatform,
  ContentFormat,
  ScheduledPost,
  AudienceMetrics,
  TrendSignal,
} from '../index';

// ─── Platform-Specific Content Strategy ───────────────────────

export interface PlatformContentStrategy {
  platform: SocialPlatform;
  bestFormats: ContentFormat[];
  optimalPostsPerDay: number;
  peakEngagementHoursUtc: number[];
  hashtagStrategy: string;
  contentPillars: string[];
  growthTactics: string[];
  apiLimits: { postsPerDay: number; engagementsPerHour: number };
}

export const SOCIAL_PLATFORM_STRATEGIES: PlatformContentStrategy[] = [
  {
    platform: 'x',
    bestFormats: ['text', 'thread', 'image'],
    optimalPostsPerDay: 5,
    peakEngagementHoursUtc: [13, 14, 15, 17, 18],
    hashtagStrategy: '1-2 relevant hashtags max, integrated naturally into text',
    contentPillars: ['Hot takes & opinions', 'Thread storytelling', 'Engagement bait (polls/questions)', 'Newsjacking', 'Value-packed tips'],
    growthTactics: ['Reply to larger accounts', 'Quote tweet with insight', 'Thread hooks that stop scrolling', 'Consistent posting schedule', 'Engagement within first 30 min'],
    apiLimits: { postsPerDay: 50, engagementsPerHour: 100 },
  },
  {
    platform: 'tiktok',
    bestFormats: ['video', 'reel'],
    optimalPostsPerDay: 3,
    peakEngagementHoursUtc: [11, 14, 19, 21],
    hashtagStrategy: '3-5 mix of trending + niche hashtags',
    contentPillars: ['Trend surfing', 'Behind-the-scenes', 'Tutorial/how-to', 'Storytelling hooks', 'Duet/stitch engagement'],
    growthTactics: ['Use trending sounds within 48 hours', 'First 3 seconds = hook', 'Post 3x daily minimum', 'Engage with FYP content in your niche', 'Batch create content'],
    apiLimits: { postsPerDay: 25, engagementsPerHour: 50 },
  },
  {
    platform: 'instagram',
    bestFormats: ['image', 'carousel', 'reel', 'story'],
    optimalPostsPerDay: 2,
    peakEngagementHoursUtc: [11, 13, 17, 19],
    hashtagStrategy: '5-10 hashtags, mix of broad (1M+) and niche (<100K)',
    contentPillars: ['Visual storytelling', 'Carousel education', 'Reels for reach', 'Stories for engagement', 'UGC reposts'],
    growthTactics: ['Reels get 2x reach vs static posts', 'Carousel = highest saves', 'Stories keep you top of feed', 'Collab posts for cross-audience', 'Consistent visual aesthetic'],
    apiLimits: { postsPerDay: 25, engagementsPerHour: 60 },
  },
  {
    platform: 'facebook',
    bestFormats: ['text', 'image', 'video', 'article'],
    optimalPostsPerDay: 2,
    peakEngagementHoursUtc: [9, 13, 16, 19],
    hashtagStrategy: '1-3 hashtags only, Facebook deprioritizes heavy hashtag use',
    contentPillars: ['Community discussion', 'Video content', 'Event promotion', 'Group engagement', 'Share-worthy content'],
    growthTactics: ['Facebook Groups outperform Pages', 'Native video > links', 'Ask questions to drive comments', 'Go Live for algorithm boost', 'Cross-promote from Instagram'],
    apiLimits: { postsPerDay: 10, engagementsPerHour: 30 },
  },
  {
    platform: 'linkedin',
    bestFormats: ['text', 'article', 'carousel', 'image'],
    optimalPostsPerDay: 1,
    peakEngagementHoursUtc: [7, 8, 12, 17],
    hashtagStrategy: '3-5 professional/industry hashtags',
    contentPillars: ['Thought leadership', 'Industry insights', 'Career stories', 'Data-driven posts', 'Company culture'],
    growthTactics: ['Personal posts > company posts', 'First comment strategy (add link in comment)', 'Engage in first 60 min', 'Document-style carousels', 'Tag relevant connections'],
    apiLimits: { postsPerDay: 5, engagementsPerHour: 25 },
  },
];

// ─── Content Calendar Generator ───────────────────────────────

export interface ContentSlot {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hourUtc: number;
  format: ContentFormat;
  pillar: string;
  platform: SocialPlatform;
}

export function generateContentCalendar(
  platform: SocialPlatform,
  postsPerDay: number
): ContentSlot[] {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === platform);
  if (!strategy) return [];

  const slots: ContentSlot[] = [];
  const effectivePostsPerDay = Math.min(postsPerDay, strategy.apiLimits.postsPerDay);

  for (let day = 0; day < 7; day++) {
    for (let i = 0; i < effectivePostsPerDay; i++) {
      const hourIndex = i % strategy.peakEngagementHoursUtc.length;
      const formatIndex = i % strategy.bestFormats.length;
      const pillarIndex = (day * effectivePostsPerDay + i) % strategy.contentPillars.length;

      slots.push({
        dayOfWeek: day,
        hourUtc: strategy.peakEngagementHoursUtc[hourIndex],
        format: strategy.bestFormats[formatIndex],
        pillar: strategy.contentPillars[pillarIndex],
        platform,
      });
    }
  }

  return slots;
}

// ─── Engagement Scoring ───────────────────────────────────────

export interface EngagementAnalysis {
  post: ScheduledPost;
  expectedEngagementRate: number;
  bestTimeToPost: number;
  hashtagRecommendations: string[];
  formatRecommendation: ContentFormat;
}

export function analyzeEngagement(
  post: ScheduledPost,
  metrics: AudienceMetrics
): EngagementAnalysis {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === post.platform);
  const bestHour = metrics.bestPostingHours[0] ?? (strategy?.peakEngagementHoursUtc[0] ?? 12);

  // Estimate engagement based on format effectiveness
  const formatMultipliers: Record<ContentFormat, number> = {
    text: 1.0,
    image: 1.3,
    video: 1.8,
    carousel: 1.6,
    story: 0.9,
    reel: 2.0,
    thread: 1.5,
    article: 1.2,
  };

  const formatMultiplier = formatMultipliers[post.format] ?? 1.0;
  const expectedEngagementRate = metrics.engagementRate * formatMultiplier;

  // Recommend best format based on platform
  const formatRecommendation = strategy?.bestFormats[0] ?? 'text';

  return {
    post,
    expectedEngagementRate: Math.round(expectedEngagementRate * 100) / 100,
    bestTimeToPost: bestHour,
    hashtagRecommendations: metrics.topHashtags.slice(0, 5),
    formatRecommendation,
  };
}

// ─── Trend Surfing ────────────────────────────────────────────

export function scoreTrendRelevance(
  trend: TrendSignal,
  brandKeywords: string[],
  minRelevance: number = 0.3
): { relevant: boolean; score: number; actionable: boolean } {
  let score = trend.relevanceScore;

  // Boost if trend topic matches brand keywords
  const topicLower = trend.topic.toLowerCase();
  const hashtagLower = trend.hashtag.toLowerCase();
  for (const keyword of brandKeywords) {
    const kw = keyword.toLowerCase();
    if (topicLower.includes(kw) || hashtagLower.includes(kw)) {
      score = Math.min(score + 0.3, 1.0);
      break;
    }
  }

  // High velocity = more urgent/actionable
  const actionable = trend.velocityPercent > 50 && score >= minRelevance;

  return {
    relevant: score >= minRelevance,
    score: Math.round(score * 100) / 100,
    actionable,
  };
}

// ─── Hashtag Optimization ───────────────────────────────────

export function selectOptimalHashtags(metrics: AudienceMetrics, platform: SocialPlatform, count?: number): string[] {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === platform);
  const desired = count ?? (strategy?.platform === 'instagram' ? 15 : strategy?.platform === 'tiktok' ? 5 : 3);
  // take top metrics hashtags, pad or trim
  const tags = metrics.topHashtags.slice(0, desired);
  while (tags.length < desired) tags.push('');
  return tags.filter((t) => t);
}

// ─── Audience Timezone Optimization ───────────────────────────

export function optimalPostTimes(
  audiences: AudienceMetrics[],
  platform: SocialPlatform
): number[] {
  const platformAudience = audiences.find((a) => a.platform === platform);
  if (platformAudience && platformAudience.bestPostingHours.length > 0) {
    return platformAudience.bestPostingHours;
  }

  const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === platform);
  return strategy?.peakEngagementHoursUtc ?? [9, 12, 17];
}
