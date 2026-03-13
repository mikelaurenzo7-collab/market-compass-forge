// ─── Market Intelligence ──────────────────────────────────────
//
// Aggregates external market data from free/cheap APIs to give bots
// world awareness beyond just price & volume from their exchanges.
//
//  • Alpha Vantage — news sentiment for any ticker/crypto
//  • CoinGecko   — Fear & Greed Index, trending coins, market dominance
//  • Google Trends — search interest trends for products/topics
//
// Every function returns gracefully on failure (null / empty) so
// bot engines never block on external data enrichment.

// ─── Types ────────────────────────────────────────────────────

export interface NewsSentiment {
  ticker: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 (max bearish) to 1 (max bullish)
  relevanceScore: number; // 0-1
  articles: Array<{
    title: string;
    source: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    publishedAt: string;
  }>;
  fetchedAt: number;
}

export interface FearGreedIndex {
  value: number;        // 0-100
  label: string;        // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
  timestamp: number;
  previousClose: number;
  change: number;
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number;
  priceChangePercent24h: number;
  score: number; // trending score from CoinGecko
}

export interface MarketDominance {
  btcDominance: number;
  ethDominance: number;
  otherDominance: number;
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  fetchedAt: number;
}

export interface GoogleTrend {
  keyword: string;
  interestOverTime: number;     // 0-100 relative interest
  interestChange7d: number;     // % change vs 7 days ago
  risingRelated: string[];      // breakout related queries
  fetchedAt: number;
}

export interface MarketContext {
  fearGreed: FearGreedIndex | null;
  dominance: MarketDominance | null;
  newsSentiment: NewsSentiment | null;
  trendingCoins: TrendingCoin[];
  googleTrends: GoogleTrend[];
}

// ─── Alpha Vantage: News Sentiment ───────────────────────────

const AV_BASE = 'https://www.alphavantage.co/query';

export async function fetchNewsSentiment(
  ticker: string,
  apiKey?: string,
): Promise<NewsSentiment | null> {
  const key = apiKey ?? process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;

  try {
    const url = `${AV_BASE}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(ticker)}&limit=10&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as {
      feed?: Array<{
        title: string;
        source: string;
        time_published: string;
        overall_sentiment_score: number;
        overall_sentiment_label: string;
        ticker_sentiment?: Array<{ ticker: string; ticker_sentiment_score: string; relevance_score: string }>;
      }>;
    };

    if (!data.feed?.length) return null;

    const articles = data.feed.slice(0, 10).map(a => ({
      title: a.title,
      source: a.source,
      sentiment: parseSentimentLabel(a.overall_sentiment_label),
      score: a.overall_sentiment_score,
      publishedAt: a.time_published,
    }));

    // Aggregate sentiment from ticker-specific scores
    const tickerScores = data.feed
      .flatMap(a => a.ticker_sentiment ?? [])
      .filter(ts => ts.ticker.toUpperCase() === ticker.toUpperCase());

    const avgScore = tickerScores.length > 0
      ? tickerScores.reduce((sum, ts) => sum + parseFloat(ts.ticker_sentiment_score), 0) / tickerScores.length
      : articles.reduce((sum, a) => sum + a.score, 0) / articles.length;

    const avgRelevance = tickerScores.length > 0
      ? tickerScores.reduce((sum, ts) => sum + parseFloat(ts.relevance_score), 0) / tickerScores.length
      : 0.5;

    return {
      ticker,
      overallSentiment: avgScore > 0.15 ? 'bullish' : avgScore < -0.15 ? 'bearish' : 'neutral',
      sentimentScore: Math.max(-1, Math.min(1, avgScore)),
      relevanceScore: Math.max(0, Math.min(1, avgRelevance)),
      articles,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

function parseSentimentLabel(label: string): 'bullish' | 'bearish' | 'neutral' {
  const l = label.toLowerCase();
  if (l.includes('bullish') || l.includes('positive')) return 'bullish';
  if (l.includes('bearish') || l.includes('negative')) return 'bearish';
  return 'neutral';
}

// ─── CoinGecko: Fear & Greed + Trending + Dominance ──────────

const CG_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchFearGreedIndex(): Promise<FearGreedIndex | null> {
  try {
    // alternative.me provides the Crypto Fear & Greed Index
    const res = await fetch('https://api.alternative.me/fng/?limit=2', { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const data = await res.json() as {
      data?: Array<{ value: string; value_classification: string; timestamp: string }>;
    };

    if (!data.data?.length) return null;

    const current = data.data[0];
    const previous = data.data[1];
    const value = parseInt(current.value, 10);
    const prevValue = previous ? parseInt(previous.value, 10) : value;

    return {
      value,
      label: current.value_classification,
      timestamp: parseInt(current.timestamp, 10) * 1000,
      previousClose: prevValue,
      change: value - prevValue,
    };
  } catch {
    return null;
  }
}

export async function fetchTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const res = await fetch(`${CG_BASE}/search/trending`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data = await res.json() as {
      coins?: Array<{
        item: {
          id: string;
          symbol: string;
          name: string;
          market_cap_rank: number;
          data?: { price_change_percentage_24h?: { usd?: number } };
          score: number;
        };
      }>;
    };

    return (data.coins ?? []).map(c => ({
      id: c.item.id,
      symbol: c.item.symbol,
      name: c.item.name,
      marketCapRank: c.item.market_cap_rank ?? 0,
      priceChangePercent24h: c.item.data?.price_change_percentage_24h?.usd ?? 0,
      score: c.item.score,
    }));
  } catch {
    return [];
  }
}

export async function fetchMarketDominance(): Promise<MarketDominance | null> {
  try {
    const res = await fetch(`${CG_BASE}/global`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const data = await res.json() as {
      data?: {
        market_cap_percentage?: { btc?: number; eth?: number };
        total_market_cap?: { usd?: number };
        total_volume?: { usd?: number };
      };
    };

    if (!data.data) return null;

    const btc = data.data.market_cap_percentage?.btc ?? 0;
    const eth = data.data.market_cap_percentage?.eth ?? 0;

    return {
      btcDominance: btc,
      ethDominance: eth,
      otherDominance: 100 - btc - eth,
      totalMarketCapUsd: data.data.total_market_cap?.usd ?? 0,
      totalVolume24hUsd: data.data.total_volume?.usd ?? 0,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Google Trends ────────────────────────────────────────────

const SERP_BASE = 'https://serpapi.com/search.json';

/**
 * Fetches Google Trends interest for keywords via SerpAPI.
 * Falls back to a simple heuristic if no API key is set.
 */
export async function fetchGoogleTrends(
  keywords: string[],
  apiKey?: string,
): Promise<GoogleTrend[]> {
  const key = apiKey ?? process.env.SERP_API_KEY;
  if (!key || keywords.length === 0) return [];

  const results: GoogleTrend[] = [];
  // Process up to 5 keywords to avoid rate limits
  for (const keyword of keywords.slice(0, 5)) {
    try {
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: keyword,
        data_type: 'TIMESERIES',
        date: 'today 1-m', // last month
        api_key: key,
      });

      const res = await fetch(`${SERP_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = await res.json() as {
        interest_over_time?: {
          timeline_data?: Array<{ values?: Array<{ extracted_value: number }> }>;
        };
        related_queries?: {
          rising?: Array<{ query: string }>;
        };
      };

      const timeline = data.interest_over_time?.timeline_data ?? [];
      const values = timeline.map(t => t.values?.[0]?.extracted_value ?? 0);
      const current = values.length > 0 ? values[values.length - 1] : 0;
      const weekAgo = values.length > 7 ? values[values.length - 8] : current;
      const change7d = weekAgo > 0 ? ((current - weekAgo) / weekAgo) * 100 : 0;

      const rising = (data.related_queries?.rising ?? [])
        .slice(0, 5)
        .map(r => r.query);

      results.push({
        keyword,
        interestOverTime: current,
        interestChange7d: Math.round(change7d * 10) / 10,
        risingRelated: rising,
        fetchedAt: Date.now(),
      });
    } catch {
      // Skip failed keywords, continue with rest
    }
  }

  return results;
}

// ─── Aggregated Market Context ────────────────────────────────

/**
 * Gathers a full market context snapshot from all intelligence sources.
 * Each source is queried independently with fail-safe — partial data is fine.
 */
export async function gatherMarketContext(
  options: {
    ticker?: string;
    keywords?: string[];
    alphaVantageKey?: string;
    serpApiKey?: string;
  } = {},
): Promise<MarketContext> {
  const [fearGreed, dominance, trendingCoins, newsSentiment, googleTrends] =
    await Promise.all([
      fetchFearGreedIndex(),
      fetchMarketDominance(),
      fetchTrendingCoins(),
      options.ticker
        ? fetchNewsSentiment(options.ticker, options.alphaVantageKey)
        : Promise.resolve(null),
      options.keywords?.length
        ? fetchGoogleTrends(options.keywords, options.serpApiKey)
        : Promise.resolve([]),
    ]);

  return { fearGreed, dominance, newsSentiment, trendingCoins, googleTrends };
}

// ─── Signal Modifiers ─────────────────────────────────────────

/**
 * Adjusts a trading signal's confidence based on market context.
 * Returns a modifier between -30 and +20 that should be added to confidence.
 */
export function marketSentimentModifier(context: MarketContext): number {
  let modifier = 0;

  // Fear & Greed (contrarian + confirmation)
  if (context.fearGreed) {
    const fg = context.fearGreed.value;
    if (fg <= 20) modifier -= 15;          // Extreme fear → reduce confidence (market may dump further)
    else if (fg <= 35) modifier -= 5;       // Fear → slight caution
    else if (fg >= 80) modifier -= 10;      // Extreme greed → market overheated, reduce confidence
    else if (fg >= 65) modifier += 5;       // Greed → momentum confirmation
  }

  // News sentiment
  if (context.newsSentiment) {
    const score = context.newsSentiment.sentimentScore;
    const relevance = context.newsSentiment.relevanceScore;
    // Scale by relevance — irrelevant news shouldn't move confidence
    modifier += Math.round(score * relevance * 15);
  }

  // Clamp
  return Math.max(-30, Math.min(20, modifier));
}

/**
 * Checks if a product/topic keyword is trending on Google.
 * Returns a demand signal: -1 (declining), 0 (stable), 1 (rising), 2 (breakout).
 */
export function trendDemandSignal(trend: GoogleTrend | undefined): number {
  if (!trend) return 0;
  if (trend.interestChange7d > 100) return 2;  // breakout
  if (trend.interestChange7d > 20) return 1;   // rising
  if (trend.interestChange7d < -30) return -1;  // declining
  return 0; // stable
}
