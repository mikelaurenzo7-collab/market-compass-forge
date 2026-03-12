import type {
  SocialPlatform,
  ContentFormat,
  ScheduledPost,
  AudienceMetrics,
  TrendSignal,
} from '../index';

// ─── Base Strategy Interface ──────────────────────────────────

/**
 * Defines the contract for a social strategy.
 * A social strategy is responsible for making decisions about what content to post.
 */
export interface SocialStrategy {
  decide(context: any): Promise<SocialStrategyDecision>;
}

/**
 * Represents a decision made by a social strategy.
 * For now, it's just a post, but it can be expanded to include other actions.
 */
export interface SocialStrategyDecision {
  post: string;
  // Future additions could include: 'retweet', 'reply', 'quote', etc.
}

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

export interface HashtagScore {
  tag: string;
  score: number;
  category: 'broad' | 'niche' | 'trending' | 'brand';
}

export function selectOptimalHashtags(
  metrics: AudienceMetrics,
  platform: SocialPlatform,
  count?: number,
  trendingHashtags?: string[],
  brandKeywords?: string[],
): HashtagScore[] {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find((s) => s.platform === platform);

  // Platform-specific hashtag count targets
  const platformCounts: Record<string, number> = {
    instagram: 10, tiktok: 5, x: 2, linkedin: 4, facebook: 2,
  };
  const desired = count ?? platformCounts[platform] ?? 5;

  const scored: HashtagScore[] = [];
  const seen = new Set<string>();

  // Score existing top hashtags from metrics
  for (let i = 0; i < metrics.topHashtags.length; i++) {
    const tag = metrics.topHashtags[i].toLowerCase().replace(/^#/, '');
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);

    // Base score from ranking position (higher ranked = better performance)
    const rankScore = 1 - (i / Math.max(metrics.topHashtags.length, 1));

    // Categorize by assumed reach (longer/more specific = niche)
    const isNiche = tag.length > 15 || tag.includes('_');
    const category: HashtagScore['category'] = isNiche ? 'niche' : 'broad';

    scored.push({ tag: `#${tag}`, score: rankScore * 0.8, category });
  }

  // Add trending hashtags with boost
  if (trendingHashtags) {
    for (const t of trendingHashtags) {
      const tag = t.toLowerCase().replace(/^#/, '');
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      scored.push({ tag: `#${tag}`, score: 0.9, category: 'trending' });
    }
  }

  // Add brand keywords as branded hashtags
  if (brandKeywords) {
    for (const kw of brandKeywords) {
      const tag = kw.toLowerCase().replace(/\s+/g, '').replace(/^#/, '');
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      scored.push({ tag: `#${tag}`, score: 0.6, category: 'brand' });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Mix strategy: ensure at least 1 broad, 1 niche if available
  const result: HashtagScore[] = [];
  const byCategory = {
    trending: scored.filter(h => h.category === 'trending'),
    broad: scored.filter(h => h.category === 'broad'),
    niche: scored.filter(h => h.category === 'niche'),
    brand: scored.filter(h => h.category === 'brand'),
  };

  // Priority: trending first, then mix
  for (const t of byCategory.trending.slice(0, Math.ceil(desired * 0.3))) {
    if (result.length < desired) result.push(t);
  }
  for (const t of byCategory.broad.slice(0, Math.ceil(desired * 0.3))) {
    if (result.length < desired) result.push(t);
  }
  for (const t of byCategory.niche.slice(0, Math.ceil(desired * 0.3))) {
    if (result.length < desired) result.push(t);
  }
  for (const t of byCategory.brand.slice(0, 2)) {
    if (result.length < desired) result.push(t);
  }

  // Fill remaining with highest scored not yet included
  for (const t of scored) {
    if (result.length >= desired) break;
    if (!result.includes(t)) result.push(t);
  }

  return result.slice(0, desired);
}

// ─── Trend-Reactive Content Generation ────────────────────────

export interface TrendPost {
  topic: string;
  hashtag: string;
  suggestedContent: string;
  format: ContentFormat;
  urgency: 'immediate' | 'within_hours' | 'today';
  relevanceScore: number;
}

export function generateTrendPost(
  trend: TrendSignal,
  platform: SocialPlatform,
  brandDescription: string,
  brandVoice?: string,
): TrendPost {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find(s => s.platform === platform);

  // Select best format for trend-reactive content per platform
  const trendFormats: Record<string, ContentFormat> = {
    x: 'thread',
    tiktok: 'video',
    instagram: 'reel',
    facebook: 'text',
    linkedin: 'text',
  };
  const format = trendFormats[platform] ?? 'text';

  // Determine urgency based on velocity
  let urgency: TrendPost['urgency'];
  if (trend.velocityPercent > 100) urgency = 'immediate';
  else if (trend.velocityPercent > 50) urgency = 'within_hours';
  else urgency = 'today';

  // Generate suggested content template (LLM will enhance this in engine)
  const voice = brandVoice ?? 'professional yet approachable';
  const pillars = strategy?.contentPillars ?? [];
  const pillar = pillars.find(p => p.toLowerCase().includes('trend')) ?? pillars[0] ?? 'Industry insights';

  let suggestedContent: string;

  if (platform === 'x') {
    suggestedContent = `🔥 ${trend.topic} is trending!\n\nHere's our take as ${brandDescription}:\n\n[Key insight about ${trend.topic}]\n\n${trend.hashtag} #trending`;
  } else if (platform === 'tiktok' || platform === 'instagram') {
    suggestedContent = `HOOK: "Did you hear about ${trend.topic}?"\n\nBODY: Our perspective as ${brandDescription} — [3 key points]\n\nCTA: Follow for more ${pillar.toLowerCase()}\n\n${trend.hashtag}`;
  } else if (platform === 'linkedin') {
    suggestedContent = `${trend.topic} is reshaping our industry.\n\nAs ${brandDescription}, here are 3 things we're watching:\n\n1. [Point 1]\n2. [Point 2]\n3. [Point 3]\n\nWhat's your take? 👇\n\n${trend.hashtag}`;
  } else {
    suggestedContent = `${trend.topic} — here's what it means for ${brandDescription}.\n\n[Share your perspective]\n\n${trend.hashtag}`;
  }

  return {
    topic: trend.topic,
    hashtag: trend.hashtag,
    suggestedContent,
    format,
    urgency,
    relevanceScore: trend.relevanceScore,
  };
}

// ─── Post Performance Analysis ────────────────────────────────

export interface PerformanceInsight {
  bestFormat: ContentFormat;
  bestPillar: string;
  bestHour: number;
  formatBreakdown: { format: ContentFormat; avgEngagement: number }[];
  recommendations: string[];
}

export function analyzePostPerformance(
  posts: ScheduledPost[],
  metrics: AudienceMetrics,
  platform: SocialPlatform,
): PerformanceInsight {
  const strategy = SOCIAL_PLATFORM_STRATEGIES.find(s => s.platform === platform);
  const recommendations: string[] = [];

  // Analyze engagement by format
  const formatEngagement = new Map<ContentFormat, { total: number; count: number }>();
  for (const post of posts) {
    const existing = formatEngagement.get(post.format) ?? { total: 0, count: 0 };
    // Use metrics engagement rate as proxy (in reality would use per-post metrics)
    const formatMultipliers: Record<ContentFormat, number> = {
      text: 1.0, image: 1.3, video: 1.8, carousel: 1.6, story: 0.9, reel: 2.0, thread: 1.5, article: 1.2,
    };
    const estimated = metrics.engagementRate * (formatMultipliers[post.format] ?? 1.0);
    existing.total += estimated;
    existing.count += 1;
    formatEngagement.set(post.format, existing);
  }

  const formatBreakdown: { format: ContentFormat; avgEngagement: number }[] = [];
  let bestFormat: ContentFormat = 'text';
  let bestFormatEngagement = 0;

  for (const [format, data] of formatEngagement) {
    const avg = data.count > 0 ? data.total / data.count : 0;
    formatBreakdown.push({ format, avgEngagement: Math.round(avg * 100) / 100 });
    if (avg > bestFormatEngagement) {
      bestFormatEngagement = avg;
      bestFormat = format;
    }
  }

  formatBreakdown.sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Best pillar (from platform strategy)
  const bestPillar = strategy?.contentPillars[0] ?? 'General content';

  // Best hour from audience data
  const bestHour = metrics.bestPostingHours[0] ?? strategy?.peakEngagementHoursUtc[0] ?? 12;

  // Generate actionable recommendations
  if (formatBreakdown.length > 1) {
    const top = formatBreakdown[0];
    const bottom = formatBreakdown[formatBreakdown.length - 1];
    if (top.avgEngagement > bottom.avgEngagement * 1.5) {
      recommendations.push(`Double down on ${top.format} content — ${(top.avgEngagement / bottom.avgEngagement).toFixed(1)}x more engagement than ${bottom.format}`);
    }
  }

  const currentPostCount = posts.length / 7; // avg per day
  if (strategy && currentPostCount < strategy.optimalPostsPerDay * 0.7) {
    recommendations.push(`Increase posting frequency to ${strategy.optimalPostsPerDay}/day (currently ~${currentPostCount.toFixed(1)}/day)`);
  } else if (strategy && currentPostCount > strategy.optimalPostsPerDay * 1.5) {
    recommendations.push(`Reduce posting to ${strategy.optimalPostsPerDay}/day — over-posting can hurt reach`);
  }

  if (metrics.engagementRate < 2) {
    recommendations.push('Engagement rate below 2% — focus on interactive content (polls, questions, CTAs)');
  } else if (metrics.engagementRate > 5) {
    recommendations.push('Strong engagement! Consider monetization opportunities or sponsored content');
  }

  // Platform-specific recommendations
  if (platform === 'instagram' && !posts.some(p => p.format === 'reel')) {
    recommendations.push('No Reels detected — Instagram Reels get 2x reach vs static posts');
  }
  if (platform === 'x' && !posts.some(p => p.format === 'thread')) {
    recommendations.push('No threads detected — X threads drive deeper engagement and follows');
  }
  if (platform === 'linkedin' && posts.filter(p => p.format === 'carousel').length === 0) {
    recommendations.push('Try document/carousel posts on LinkedIn — they get highest saves');
  }

  // Growth tactics from strategy
  if (strategy && recommendations.length < 5) {
    for (const tactic of strategy.growthTactics.slice(0, 2)) {
      recommendations.push(`Growth tip: ${tactic}`);
    }
  }

  return {
    bestFormat,
    bestPillar,
    bestHour,
    formatBreakdown,
    recommendations,
  };
}

// ─── Comment Intent Classification ────────────────────────────

export type CommentIntent = 'question' | 'complaint' | 'praise' | 'spam' | 'neutral' | 'purchase_interest';

export function classifyCommentIntent(text: string): { intent: CommentIntent; confidence: number } {
  const lower = text.toLowerCase();

  // Spam detection
  const spamSignals = ['click here', 'free money', 'dm me', 'check my bio', 'follow me', 'subscribe', 'bit.ly', 'tinyurl'];
  if (spamSignals.some(s => lower.includes(s))) {
    return { intent: 'spam', confidence: 0.9 };
  }

  // Purchase interest
  const buySignals = ['how much', 'price', 'where to buy', 'link', 'available', 'in stock', 'ship to', 'do you sell', 'cost', 'order'];
  if (buySignals.some(s => lower.includes(s))) {
    return { intent: 'purchase_interest', confidence: 0.8 };
  }

  // Question detection
  const questionSignals = /\?|^(how|what|when|where|why|who|can|does|will|is|are|do)\b/i;
  if (questionSignals.test(lower)) {
    return { intent: 'question', confidence: 0.75 };
  }

  // Complaint detection
  const complaintWords = ['broken', 'terrible', 'worst', 'hate', 'scam', 'disappointed', 'refund', 'return', 'problem', 'issue', 'unacceptable'];
  if (complaintWords.some(w => lower.includes(w))) {
    return { intent: 'complaint', confidence: 0.8 };
  }

  // Praise detection
  const praiseWords = ['love', 'amazing', 'best', 'awesome', 'great', 'perfect', 'obsessed', 'fire', '🔥', '❤️', '💯', 'incredible'];
  if (praiseWords.some(w => lower.includes(w))) {
    return { intent: 'praise', confidence: 0.75 };
  }

  return { intent: 'neutral', confidence: 0.5 };
}

export function generateCommentReply(
  commentText: string,
  intent: CommentIntent,
  brandVoice: string,
  productContext?: string,
): string {
  const context = productContext ? ` about ${productContext}` : '';

  switch (intent) {
    case 'question':
      return `Great question${context}! We'd love to help — check out our bio for more info or DM us for details! 💬`;
    case 'complaint':
      return `We're sorry to hear about your experience${context}. Please DM us so we can make this right ASAP. Your satisfaction matters to us! 🙏`;
    case 'praise':
      return `Thank you so much! 🙌 We love hearing this — it means the world to us! Stay tuned for more exciting things coming soon!`;
    case 'purchase_interest':
      return `Thanks for your interest${context}! Check the link in our bio for pricing and availability, or DM us for a quick answer! 🛒`;
    case 'spam':
      return ''; // Don't respond to spam
    case 'neutral':
    default:
      return `Thanks for engaging with us! We appreciate our community. 💙`;
  }
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
