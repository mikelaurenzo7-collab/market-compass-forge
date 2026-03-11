// ─── Prompt Template System ────────────────────────────────────
//
// Structured prompt templates for all LLM use-cases across the platform.
// Each template defines a system prompt, user prompt builder, and
// expected output schema (for structured parsing).

export interface PromptTemplate<TInput, TOutput> {
  /** Unique template identifier */
  id: string;
  /** System-level instructions for the LLM */
  system: string;
  /** Build the user message from structured input */
  buildUserPrompt: (input: TInput) => string;
  /** Parse the LLM response into a typed object; returns null on failure */
  parseResponse: (raw: string) => TOutput | null;
  /** Suggested model override (if different from default) */
  model?: string;
  /** Max tokens for this template */
  maxTokens?: number;
  /** Preferred LLM provider for this template */
  provider?: 'openai' | 'anthropic' | 'grok';
}

// ─── Trading Insight Types ─────────────────────────────────────

export interface TradingInsightInput {
  symbol: string;
  platform: string;
  price: number;
  change24h: number;
  volume24h: number;
  direction: string;
  confidence: number;
  indicators: Record<string, number | undefined>;
  strategy: string;
  positionCount: number;
  winRate: number;
}

export interface TradingInsight {
  summary: string;
  marketContext: string;
  riskAssessment: 'low' | 'medium' | 'high';
  conviction: number; // 0-100
  reasoning: string[];
  suggestedAction: string;
}

// ─── Sentiment Analysis Types ──────────────────────────────────

export interface SentimentInput {
  reviews: Array<{ id: string; rating: number; text: string }>;
  productTitle?: string;
  platform?: string;
}

export interface SentimentResult {
  overallScore: number; // -1 to 1
  overallLabel: 'positive' | 'neutral' | 'negative';
  reviewSentiments: Array<{
    id: string;
    score: number;
    label: string;
    keyPhrases: string[];
  }>;
  themes: Array<{ theme: string; sentiment: string; count: number }>;
  actionItems: string[];
}

// ─── Social Content Types ──────────────────────────────────────

export interface SocialContentInput {
  platform: string;
  format: string;
  pillar: string;
  brandVoice: string;
  brandDescription: string;
  recentTrends: string[];
  audienceSize: number;
  engagementRate: number;
}

export interface SocialContentOutput {
  content: string;
  suggestedHashtags: string[];
  callToAction: string;
  estimatedEngagement: 'low' | 'medium' | 'high';
}

// ─── Store Pricing Insight Types ───────────────────────────────

export interface PricingInsightInput {
  productTitle: string;
  currentPrice: number;
  competitorPrices: number[];
  demandScore: number;
  inventoryDays: number;
  platform: string;
  costOfGoods: number;
}

export interface PricingInsight {
  recommendedAction: string;
  reasoning: string;
  marketPosition: 'underpriced' | 'competitive' | 'premium' | 'overpriced';
  confidenceLevel: number;
}

// ─── Template Definitions ──────────────────────────────────────

export const TRADING_INSIGHT_TEMPLATE: PromptTemplate<TradingInsightInput, TradingInsight> = {
  id: 'trading_insight',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  system: `You are a quantitative trading analyst. Evaluate the given market signal and indicators, then provide a structured JSON assessment. Be objective, cite specific indicator values in your reasoning, and never recommend risking more than appropriate given the signal confidence. Always respond with valid JSON matching the schema.`,
  buildUserPrompt: (input) => {
    const indicatorStr = Object.entries(input.indicators)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(4) : v}`)
      .join(', ');
    return `Analyze this trading signal:
Symbol: ${input.symbol} on ${input.platform}
Price: $${input.price.toFixed(2)} (24h change: ${(input.change24h * 100).toFixed(2)}%)
Volume 24h: ${input.volume24h.toFixed(0)}
Strategy: ${input.strategy}
Signal: ${input.direction} (confidence: ${input.confidence}%)
Indicators: ${indicatorStr}
Current positions: ${input.positionCount}, Win rate: ${(input.winRate * 100).toFixed(1)}%

Respond with JSON: { "summary": string, "marketContext": string, "riskAssessment": "low"|"medium"|"high", "conviction": number 0-100, "reasoning": [string], "suggestedAction": string }`;
  },
  parseResponse: (raw) => {
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed.summary || !parsed.riskAssessment) return null;
      return {
        summary: String(parsed.summary),
        marketContext: String(parsed.marketContext ?? ''),
        riskAssessment: ['low', 'medium', 'high'].includes(parsed.riskAssessment) ? parsed.riskAssessment : 'medium',
        conviction: Math.max(0, Math.min(100, Number(parsed.conviction ?? 50))),
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [],
        suggestedAction: String(parsed.suggestedAction ?? ''),
      };
    } catch {
      return null;
    }
  },
  maxTokens: 400,
};

export const SENTIMENT_ANALYSIS_TEMPLATE: PromptTemplate<SentimentInput, SentimentResult> = {
  id: 'sentiment_analysis',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  system: `You are a product review sentiment analyst. Analyze customer reviews to extract sentiment scores, key themes, and actionable insights. Score each review from -1 (very negative) to +1 (very positive). Identify recurring themes and suggest concrete improvements. Always respond with valid JSON.`,
  buildUserPrompt: (input) => {
    const reviewBlock = input.reviews
      .slice(0, 20) // cap to avoid token explosion
      .map((r, i) => `[${i + 1}] Rating: ${r.rating}/5 — "${r.text}"`)
      .join('\n');
    return `Analyze these product reviews${input.productTitle ? ` for "${input.productTitle}"` : ''}${input.platform ? ` on ${input.platform}` : ''}:

${reviewBlock}

Respond with JSON:
{
  "overallScore": number (-1 to 1),
  "overallLabel": "positive"|"neutral"|"negative",
  "reviewSentiments": [{ "id": string, "score": number, "label": string, "keyPhrases": [string] }],
  "themes": [{ "theme": string, "sentiment": string, "count": number }],
  "actionItems": [string]
}`;
  },
  parseResponse: (raw) => {
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.overallScore !== 'number') return null;
      return {
        overallScore: Math.max(-1, Math.min(1, parsed.overallScore)),
        overallLabel: ['positive', 'neutral', 'negative'].includes(parsed.overallLabel)
          ? parsed.overallLabel : 'neutral',
        reviewSentiments: Array.isArray(parsed.reviewSentiments)
          ? parsed.reviewSentiments.map((r: Record<string, unknown>) => ({
              id: String(r.id ?? ''),
              score: Math.max(-1, Math.min(1, Number(r.score ?? 0))),
              label: String(r.label ?? 'neutral'),
              keyPhrases: Array.isArray(r.keyPhrases) ? r.keyPhrases.map(String) : [],
            }))
          : [],
        themes: Array.isArray(parsed.themes)
          ? parsed.themes.map((t: Record<string, unknown>) => ({
              theme: String(t.theme ?? ''),
              sentiment: String(t.sentiment ?? 'neutral'),
              count: Number(t.count ?? 0),
            }))
          : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String) : [],
      };
    } catch {
      return null;
    }
  },
  maxTokens: 600,
};

export const SOCIAL_CONTENT_TEMPLATE: PromptTemplate<SocialContentInput, SocialContentOutput> = {
  id: 'social_content',
  provider: 'openai',
  model: 'gpt-4o',
  system: `You are a social media content strategist. Create engaging, platform-appropriate content that aligns with the brand voice. Optimize for engagement while staying authentic. Include relevant hashtags and a clear call-to-action. Always respond with valid JSON.`,
  buildUserPrompt: (input) => {
    const trendsStr = input.recentTrends.length > 0
      ? `Trending topics: ${input.recentTrends.join(', ')}`
      : 'No specific trends to leverage';
    return `Create a ${input.format} post for ${input.platform}.

Content pillar: ${input.pillar}
Brand voice: ${input.brandVoice || 'professional and engaging'}
Brand: ${input.brandDescription || 'technology company'}
Audience: ${input.audienceSize.toLocaleString()} followers, ${(input.engagementRate * 100).toFixed(1)}% engagement rate
${trendsStr}

Respond with JSON:
{ "content": string, "suggestedHashtags": [string], "callToAction": string, "estimatedEngagement": "low"|"medium"|"high" }`;
  },
  parseResponse: (raw) => {
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed.content) return null;
      return {
        content: String(parsed.content),
        suggestedHashtags: Array.isArray(parsed.suggestedHashtags)
          ? parsed.suggestedHashtags.map(String)
          : [],
        callToAction: String(parsed.callToAction ?? ''),
        estimatedEngagement: ['low', 'medium', 'high'].includes(parsed.estimatedEngagement)
          ? parsed.estimatedEngagement : 'medium',
      };
    } catch {
      return null;
    }
  },
  maxTokens: 400,
};

export const PRICING_INSIGHT_TEMPLATE: PromptTemplate<PricingInsightInput, PricingInsight> = {
  id: 'pricing_insight',
  provider: 'openai',
  model: 'gpt-4o-mini',
  system: `You are an e-commerce pricing strategist. Analyze competitive positioning, demand signals, and inventory levels to provide pricing recommendations. Be data-driven and cite specific numbers. Always respond with valid JSON.`,
  buildUserPrompt: (input) => {
    const compStr = input.competitorPrices.length > 0
      ? `Competitor prices: $${input.competitorPrices.map(p => p.toFixed(2)).join(', $')} (avg: $${(input.competitorPrices.reduce((a, b) => a + b, 0) / input.competitorPrices.length).toFixed(2)})`
      : 'No competitor data available';
    return `Analyze pricing for:
Product: ${input.productTitle} on ${input.platform}
Current price: $${input.currentPrice.toFixed(2)}
Cost of goods: $${input.costOfGoods.toFixed(2)} (margin: ${(((input.currentPrice - input.costOfGoods) / input.currentPrice) * 100).toFixed(1)}%)
${compStr}
Demand score: ${input.demandScore}/100
Inventory days remaining: ${input.inventoryDays}

Respond with JSON:
{ "recommendedAction": string, "reasoning": string, "marketPosition": "underpriced"|"competitive"|"premium"|"overpriced", "confidenceLevel": number 0-100 }`;
  },
  parseResponse: (raw) => {
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed.recommendedAction) return null;
      return {
        recommendedAction: String(parsed.recommendedAction),
        reasoning: String(parsed.reasoning ?? ''),
        marketPosition: ['underpriced', 'competitive', 'premium', 'overpriced'].includes(parsed.marketPosition)
          ? parsed.marketPosition : 'competitive',
        confidenceLevel: Math.max(0, Math.min(100, Number(parsed.confidenceLevel ?? 50))),
      };
    } catch {
      return null;
    }
  },
  maxTokens: 300,
};

// ─── Keyword-based Sentiment (fallback) ────────────────────────

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'love', 'happy', 'satisfied', 'amazing',
  'wonderful', 'fantastic', 'perfect', 'awesome', 'outstanding', 'brilliant',
  'superb', 'recommend', 'impressed', 'reliable', 'quality', 'best', 'fast',
];
const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'poor', 'hate', 'disappointed', 'horrible',
  'worst', 'broken', 'defective', 'useless', 'overpriced', 'slow', 'cheap',
  'junk', 'waste', 'scam', 'frustrating', 'return', 'refund',
];

/**
 * Local keyword-based sentiment analysis. Used as fallback when LLM is
 * disabled or unavailable. Expanded from the original 6-word lists.
 */
export function keywordSentiment(text: string): { score: number; label: string; keyPhrases: string[] } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let score = 0;
  const found: string[] = [];

  for (const w of words) {
    if (POSITIVE_WORDS.includes(w)) { score += 0.1; found.push(w); }
    if (NEGATIVE_WORDS.includes(w)) { score -= 0.1; found.push(w); }
  }

  // Handle negation modifiers
  const negators = ['not', "n't", 'never', 'no'];
  for (let i = 0; i < words.length - 1; i++) {
    if (negators.some(n => words[i].endsWith(n) || words[i] === n)) {
      if (POSITIVE_WORDS.includes(words[i + 1])) score -= 0.2; // negate positive
      if (NEGATIVE_WORDS.includes(words[i + 1])) score += 0.2; // negate negative
    }
  }

  score = Math.max(-1, Math.min(1, score));
  const label = score < -0.1 ? 'negative' : score > 0.1 ? 'positive' : 'neutral';
  return { score, label, keyPhrases: found };
}

/**
 * Batch keyword sentiment for multiple reviews (fallback).
 */
export function batchKeywordSentiment(
  reviews: Array<{ id: string; rating: number; text: string }>,
  productTitle?: string,
): SentimentResult {
  const sentiments = reviews.map((r) => {
    const kw = keywordSentiment(r.text);
    // Blend keyword score with rating-based score
    const ratingScore = (r.rating - 3) / 2; // 1→-1, 3→0, 5→1
    const blendedScore = kw.score * 0.6 + ratingScore * 0.4;
    return {
      id: r.id,
      score: Math.max(-1, Math.min(1, blendedScore)),
      label: blendedScore < -0.1 ? 'negative' : blendedScore > 0.1 ? 'positive' : 'neutral',
      keyPhrases: kw.keyPhrases,
    };
  });

  const avgScore = sentiments.length > 0
    ? sentiments.reduce((s, r) => s + r.score, 0) / sentiments.length
    : 0;

  // Extract themes from keyword frequencies
  const phraseCounts = new Map<string, { positive: number; negative: number }>();
  for (const s of sentiments) {
    for (const phrase of s.keyPhrases) {
      const entry = phraseCounts.get(phrase) ?? { positive: 0, negative: 0 };
      if (s.score > 0) entry.positive++;
      else entry.negative++;
      phraseCounts.set(phrase, entry);
    }
  }

  const themes = [...phraseCounts.entries()]
    .sort((a, b) => (b[1].positive + b[1].negative) - (a[1].positive + a[1].negative))
    .slice(0, 5)
    .map(([theme, counts]) => ({
      theme,
      sentiment: counts.positive > counts.negative ? 'positive' : 'negative',
      count: counts.positive + counts.negative,
    }));

  // Generate action items
  const actionItems: string[] = [];
  const negReviews = sentiments.filter(s => s.score < -0.1);
  if (negReviews.length > sentiments.length * 0.3) {
    actionItems.push(`${negReviews.length} of ${sentiments.length} reviews are negative — investigate common complaints`);
  }
  const negThemes = themes.filter(t => t.sentiment === 'negative');
  for (const t of negThemes.slice(0, 3)) {
    actionItems.push(`Address recurring issue: "${t.theme}" (mentioned ${t.count} times)`);
  }
  if (productTitle && sentiments.length < 5) {
    actionItems.push(`Low review count for "${productTitle}" — consider requesting more customer reviews`);
  }

  return {
    overallScore: Math.max(-1, Math.min(1, avgScore)),
    overallLabel: avgScore < -0.1 ? 'negative' : avgScore > 0.1 ? 'positive' : 'neutral',
    reviewSentiments: sentiments,
    themes,
    actionItems,
  };
}
