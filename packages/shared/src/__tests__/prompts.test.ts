import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  keywordSentiment,
  batchKeywordSentiment,
  TRADING_INSIGHT_TEMPLATE,
  SENTIMENT_ANALYSIS_TEMPLATE,
  SOCIAL_CONTENT_TEMPLATE,
  PRICING_INSIGHT_TEMPLATE,
  type TradingInsightInput,
  type SentimentInput,
  type SocialContentInput,
  type PricingInsightInput,
} from '../prompts';

// ─── keywordSentiment ──────────────────────────────────────────

describe('keywordSentiment', () => {
  it('scores positive text', () => {
    const result = keywordSentiment('This product is great and I love it');
    expect(result.score).toBeGreaterThan(0);
    expect(result.label).toBe('positive');
    expect(result.keyPhrases).toContain('great');
    expect(result.keyPhrases).toContain('love');
  });

  it('scores negative text', () => {
    const result = keywordSentiment('terrible product, really awful and broken');
    expect(result.score).toBeLessThan(0);
    expect(result.label).toBe('negative');
    expect(result.keyPhrases).toContain('terrible');
  });

  it('scores neutral text', () => {
    const result = keywordSentiment('The package arrived on Tuesday');
    expect(result.score).toBe(0);
    expect(result.label).toBe('neutral');
    expect(result.keyPhrases).toHaveLength(0);
  });

  it('handles negation modifiers', () => {
    const positive = keywordSentiment('good product');
    const negated = keywordSentiment('not good product');
    expect(negated.score).toBeLessThan(positive.score);
  });

  it('clamps score to [-1, 1]', () => {
    // Many positive words
    const text = 'great excellent amazing wonderful fantastic perfect awesome outstanding brilliant superb';
    const result = keywordSentiment(text);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(-1);
  });
});

// ─── batchKeywordSentiment ─────────────────────────────────────

describe('batchKeywordSentiment', () => {
  it('analyzes batch of reviews with blended scores', () => {
    const reviews = [
      { id: 'r1', rating: 5, text: 'Excellent quality, love it!' },
      { id: 'r2', rating: 1, text: 'Terrible, broken on arrival' },
      { id: 'r3', rating: 3, text: 'Average product, nothing special' },
    ];
    const result = batchKeywordSentiment(reviews, 'Test Product');

    expect(result.overallScore).toBeGreaterThanOrEqual(-1);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(['positive', 'neutral', 'negative']).toContain(result.overallLabel);
    expect(result.reviewSentiments).toHaveLength(3);

    // r1 should be positive
    const r1 = result.reviewSentiments.find(s => s.id === 'r1');
    expect(r1!.score).toBeGreaterThan(0);

    // r2 should be negative
    const r2 = result.reviewSentiments.find(s => s.id === 'r2');
    expect(r2!.score).toBeLessThan(0);
  });

  it('generates action items for high negative ratio', () => {
    const reviews = [
      { id: 'r1', rating: 1, text: 'Terrible' },
      { id: 'r2', rating: 1, text: 'Awful product' },
      { id: 'r3', rating: 1, text: 'Poor quality' },
      { id: 'r4', rating: 5, text: 'Great' },
    ];
    const result = batchKeywordSentiment(reviews);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it('suggests more reviews when count is low', () => {
    const reviews = [
      { id: 'r1', rating: 5, text: 'Good' },
    ];
    const result = batchKeywordSentiment(reviews, 'Widget');
    expect(result.actionItems.some(a => a.includes('review count'))).toBe(true);
  });

  it('extracts themes from keyword frequencies', () => {
    const reviews = [
      { id: 'r1', rating: 1, text: 'broken and terrible' },
      { id: 'r2', rating: 1, text: 'broken arrived broken' },
      { id: 'r3', rating: 5, text: 'quality is excellent' },
    ];
    const result = batchKeywordSentiment(reviews);
    expect(result.themes.length).toBeGreaterThan(0);
    // 'broken' should be a theme
    expect(result.themes.some(t => t.theme === 'broken')).toBe(true);
  });

  it('handles empty reviews', () => {
    const result = batchKeywordSentiment([]);
    expect(result.overallScore).toBe(0);
    expect(result.overallLabel).toBe('neutral');
    expect(result.reviewSentiments).toHaveLength(0);
  });
});

// ─── Template parseResponse ───────────────────────────────────

describe('TRADING_INSIGHT_TEMPLATE', () => {
  it('builds a user prompt with all fields', () => {
    const input: TradingInsightInput = {
      symbol: 'BTC-USD',
      platform: 'coinbase',
      price: 42000,
      change24h: 0.02,
      volume24h: 1_200_000_000,
      direction: 'buy',
      confidence: 75,
      indicators: { rsi: 45, macd: 0.2, atr: 500 },
      strategy: 'momentum',
      positionCount: 2,
      winRate: 0.6,
    };
    const prompt = TRADING_INSIGHT_TEMPLATE.buildUserPrompt(input);
    expect(prompt).toContain('BTC-USD');
    expect(prompt).toContain('coinbase');
    expect(prompt).toContain('momentum');
    expect(prompt).toContain('buy');
  });

  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      summary: 'Bullish momentum signal',
      marketContext: 'Uptrend with high volume',
      riskAssessment: 'medium',
      conviction: 72,
      reasoning: ['RSI oversold bounce', 'Volume confirmation'],
      suggestedAction: 'Enter long with small position',
    });
    const result = TRADING_INSIGHT_TEMPLATE.parseResponse(json);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('Bullish momentum signal');
    expect(result!.riskAssessment).toBe('medium');
    expect(result!.conviction).toBe(72);
    expect(result!.reasoning).toHaveLength(2);
  });

  it('parses JSON wrapped in markdown code block', () => {
    const wrapped = '```json\n{"summary":"test","marketContext":"","riskAssessment":"low","conviction":50,"reasoning":[],"suggestedAction":"hold"}\n```';
    const result = TRADING_INSIGHT_TEMPLATE.parseResponse(wrapped);
    expect(result).not.toBeNull();
    expect(result!.riskAssessment).toBe('low');
  });

  it('returns null for invalid JSON', () => {
    expect(TRADING_INSIGHT_TEMPLATE.parseResponse('not json')).toBeNull();
  });

  it('returns null when required fields missing', () => {
    expect(TRADING_INSIGHT_TEMPLATE.parseResponse('{"conviction": 50}')).toBeNull();
  });

  it('clamps conviction to 0-100', () => {
    const json = JSON.stringify({
      summary: 'test',
      riskAssessment: 'high',
      conviction: 150,
      reasoning: [],
      suggestedAction: 'hold',
    });
    const result = TRADING_INSIGHT_TEMPLATE.parseResponse(json);
    expect(result!.conviction).toBe(100);
  });
});

describe('SENTIMENT_ANALYSIS_TEMPLATE', () => {
  it('builds prompt with reviews', () => {
    const input: SentimentInput = {
      reviews: [
        { id: 'r1', rating: 4, text: 'Great product' },
        { id: 'r2', rating: 2, text: 'Poor quality' },
      ],
      productTitle: 'Widget Pro',
      platform: 'shopify',
    };
    const prompt = SENTIMENT_ANALYSIS_TEMPLATE.buildUserPrompt(input);
    expect(prompt).toContain('Widget Pro');
    expect(prompt).toContain('shopify');
    expect(prompt).toContain('Great product');
    expect(prompt).toContain('Poor quality');
  });

  it('caps reviews at 20', () => {
    const reviews = Array.from({ length: 30 }, (_, i) => ({
      id: `r${i}`, rating: 3, text: `Review ${i}`,
    }));
    const prompt = SENTIMENT_ANALYSIS_TEMPLATE.buildUserPrompt({ reviews });
    // Only first 20 should appear
    expect(prompt).toContain('[20]');
    expect(prompt).not.toContain('[21]');
  });

  it('parses valid response', () => {
    const json = JSON.stringify({
      overallScore: 0.4,
      overallLabel: 'positive',
      reviewSentiments: [{ id: 'r1', score: 0.8, label: 'positive', keyPhrases: ['great'] }],
      themes: [{ theme: 'quality', sentiment: 'positive', count: 3 }],
      actionItems: ['Keep up the good work'],
    });
    const result = SENTIMENT_ANALYSIS_TEMPLATE.parseResponse(json);
    expect(result).not.toBeNull();
    expect(result!.overallScore).toBe(0.4);
    expect(result!.reviewSentiments).toHaveLength(1);
    expect(result!.themes[0].theme).toBe('quality');
  });

  it('clamps overallScore to [-1,1]', () => {
    const json = JSON.stringify({
      overallScore: 5,
      overallLabel: 'positive',
      reviewSentiments: [],
      themes: [],
      actionItems: [],
    });
    const result = SENTIMENT_ANALYSIS_TEMPLATE.parseResponse(json);
    expect(result!.overallScore).toBe(1);
  });
});

describe('SOCIAL_CONTENT_TEMPLATE', () => {
  it('builds prompt with brand context', () => {
    const input: SocialContentInput = {
      platform: 'x',
      format: 'thread',
      pillar: 'thought_leadership',
      brandVoice: 'witty and casual',
      brandDescription: 'AI automation startup',
      recentTrends: ['#AI', '#automation'],
      audienceSize: 10000,
      engagementRate: 3.5,
    };
    const prompt = SOCIAL_CONTENT_TEMPLATE.buildUserPrompt(input);
    expect(prompt).toContain('thread');
    expect(prompt).toContain('witty and casual');
    expect(prompt).toContain('AI automation startup');
    expect(prompt).toContain('#AI');
  });

  it('parses valid response', () => {
    const json = JSON.stringify({
      content: 'Check out our latest AI tool!',
      suggestedHashtags: ['#AI', '#automation'],
      callToAction: 'Try it free today',
      estimatedEngagement: 'high',
    });
    const result = SOCIAL_CONTENT_TEMPLATE.parseResponse(json);
    expect(result).not.toBeNull();
    expect(result!.content).toBe('Check out our latest AI tool!');
    expect(result!.suggestedHashtags).toContain('#AI');
    expect(result!.estimatedEngagement).toBe('high');
  });

  it('returns null when content missing', () => {
    expect(SOCIAL_CONTENT_TEMPLATE.parseResponse('{"suggestedHashtags":[]}')).toBeNull();
  });
});

describe('PRICING_INSIGHT_TEMPLATE', () => {
  it('builds prompt with competitive data', () => {
    const input: PricingInsightInput = {
      productTitle: 'Wireless Headphones',
      currentPrice: 79.99,
      competitorPrices: [69.99, 84.99, 74.99],
      demandScore: 68,
      inventoryDays: 25,
      platform: 'amazon',
      costOfGoods: 30,
    };
    const prompt = PRICING_INSIGHT_TEMPLATE.buildUserPrompt(input);
    expect(prompt).toContain('Wireless Headphones');
    expect(prompt).toContain('amazon');
    expect(prompt).toContain('79.99');
    expect(prompt).toContain('69.99');
  });

  it('handles empty competitor prices', () => {
    const input: PricingInsightInput = {
      productTitle: 'Test', currentPrice: 50, competitorPrices: [],
      demandScore: 50, inventoryDays: 30, platform: 'shopify', costOfGoods: 20,
    };
    const prompt = PRICING_INSIGHT_TEMPLATE.buildUserPrompt(input);
    expect(prompt).toContain('No competitor data');
  });

  it('parses valid response', () => {
    const json = JSON.stringify({
      recommendedAction: 'Lower price by 5%',
      reasoning: 'Competitors are aggressively priced',
      marketPosition: 'overpriced',
      confidenceLevel: 80,
    });
    const result = PRICING_INSIGHT_TEMPLATE.parseResponse(json);
    expect(result).not.toBeNull();
    expect(result!.marketPosition).toBe('overpriced');
    expect(result!.confidenceLevel).toBe(80);
  });
});

// ─── promptWithTemplate (integration with mock LLM) ────────────

describe('promptWithTemplate', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.DISABLE_LLM;
    process.env.DISABLE_LLM = 'true';
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DISABLE_LLM;
    else process.env.DISABLE_LLM = originalEnv;
  });

  it('returns null result when LLM is disabled', async () => {
    // Dynamic import to pick up env change
    const { promptWithTemplate } = await import('../llm');
    const { result, raw } = await promptWithTemplate(TRADING_INSIGHT_TEMPLATE, {
      symbol: 'BTC', platform: 'coinbase', price: 42000, change24h: 0.01,
      volume24h: 1e9, direction: 'buy', confidence: 70,
      indicators: { rsi: 45 }, strategy: 'momentum', positionCount: 1, winRate: 0.5,
    });
    // LLM disabled returns '[LLM disabled]' which can't be parsed
    expect(raw).toBe('[LLM disabled]');
    expect(result).toBeNull();
  });
});
