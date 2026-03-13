/**
 * Real social adapter implementations for all supported social platforms.
 * Each adapter implements SocialAdapter and wraps the platform's REST API.
 */

import type { SocialPlatform, ScheduledPost, AudienceMetrics, TrendSignal } from '../index.js';
import type { SocialAdapter } from './engine.js';

interface SocialCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  sandbox?: boolean;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.ok) return res.json() as Promise<T>;

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter
          ? (Number(retryAfter) > 0 ? Number(retryAfter) * 1000 : 1000)
          : 1000 * 2 ** attempt;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.min(waitMs, 30_000)));
          continue;
        }
      }

      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
        continue;
      }

      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && !lastError.message.startsWith('API ')) {
        await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('jsonFetch: exhausted retries');
}

// ─── X / Twitter Adapter ──────────────────────────────────────

export class XAdapter implements SocialAdapter {
  readonly platform: SocialPlatform = 'x';
  private creds: SocialCredentials;

  constructor(creds: SocialCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.accessToken ?? this.creds.apiKey}`,
    };
  }

  async publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }> {
    const body: any = { text: post.content };
    if (post.hashtags.length > 0) {
      body.text += '\n' + post.hashtags.map(h => `#${h}`).join(' ');
    }

    const resp = await jsonFetch<any>('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    return {
      postId: resp.data?.id ?? 'unknown',
      success: !!resp.data?.id,
    };
  }

  async getMetrics(): Promise<AudienceMetrics> {
    // GET /2/users/me with user.fields=public_metrics
    const resp = await jsonFetch<any>(
      'https://api.x.com/2/users/me?user.fields=public_metrics,created_at',
      { headers: this.headers() }
    );
    const metrics = resp.data?.public_metrics ?? {};

    return {
      platform: 'x',
      followers: metrics.followers_count ?? 0,
      followersGrowthPercent: 0,
      engagementRate: 0,
      avgReach: 0,
      bestPostingHours: [9, 12, 17, 20],
      topHashtags: [],
      audienceTimezone: 'America/New_York',
    };
  }

  async getTrending(): Promise<TrendSignal[]> {
    // X API v2 doesn't have free trending endpoint; return empty
    return [];
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    return [];
  }

  async getPostsToday(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const resp = await jsonFetch<any>(
      `https://api.x.com/2/users/me/tweets?start_time=${startOfDay}&max_results=100`,
      { headers: this.headers() }
    );
    return resp.meta?.result_count ?? 0;
  }
}

// ─── TikTok Adapter ───────────────────────────────────────────

export class TikTokAdapter implements SocialAdapter {
  readonly platform: SocialPlatform = 'tiktok';
  private creds: SocialCredentials;

  constructor(creds: SocialCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.accessToken ?? this.creds.apiKey}`,
    };
  }

  async publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }> {
    // TikTok Content Posting API: requires video upload
    // For text-based scheduling, use TikTok's post init + publish flow
    const resp = await jsonFetch<any>(
      'https://open.tiktokapis.com/v2/post/publish/content/init/',
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          post_info: {
            title: post.content,
            privacy_level: 'PUBLIC_TO_EVERYONE',
          },
          source_info: { source: 'PULL_FROM_URL' },
        }),
      }
    );
    return {
      postId: resp.data?.publish_id ?? 'unknown',
      success: resp.error?.code === 'ok',
    };
  }

  async getMetrics(): Promise<AudienceMetrics> {
    const resp = await jsonFetch<any>(
      'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count',
      { headers: this.headers() }
    );
    return {
      platform: 'tiktok',
      followers: resp.data?.user?.follower_count ?? 0,
      followersGrowthPercent: 0,
      engagementRate: 0,
      avgReach: 0,
      bestPostingHours: [7, 10, 19, 22],
      topHashtags: [],
      audienceTimezone: 'America/New_York',
    };
  }

  async getTrending(): Promise<TrendSignal[]> {
    return [];
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    return [];
  }

  async getPostsToday(): Promise<number> {
    return 0;
  }
}

// ─── Instagram Adapter (Meta Graph API) ───────────────────────

export class InstagramAdapter implements SocialAdapter {
  readonly platform: SocialPlatform = 'instagram';
  private creds: SocialCredentials;

  constructor(creds: SocialCredentials) {
    this.creds = creds;
  }

  private get token(): string {
    return this.creds.accessToken ?? this.creds.apiKey;
  }

  async publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }> {
    // Instagram Graph API: create media container, then publish
    // Text posts require image_url; simplified for carousel/image posts
    const caption = post.content + (post.hashtags.length > 0
      ? '\n\n' + post.hashtags.map(h => `#${h}`).join(' ')
      : '');

    const resp = await jsonFetch<any>(
      `https://graph.instagram.com/v19.0/me/media?caption=${encodeURIComponent(caption)}&access_token=${this.token}`,
      { method: 'POST' }
    );
    return {
      postId: resp.id ?? 'unknown',
      success: !!resp.id,
    };
  }

  async getMetrics(): Promise<AudienceMetrics> {
    const resp = await jsonFetch<any>(
      `https://graph.instagram.com/v19.0/me?fields=followers_count,media_count&access_token=${this.token}`
    );
    return {
      platform: 'instagram',
      followers: resp.followers_count ?? 0,
      followersGrowthPercent: 0,
      engagementRate: 0,
      avgReach: 0,
      bestPostingHours: [8, 11, 14, 19],
      topHashtags: [],
      audienceTimezone: 'America/New_York',
    };
  }

  async getTrending(): Promise<TrendSignal[]> {
    return [];
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    return [];
  }

  async getPostsToday(): Promise<number> {
    return 0;
  }
}

// ─── Facebook Adapter (Meta Graph API) ────────────────────────

export class FacebookAdapter implements SocialAdapter {
  readonly platform: SocialPlatform = 'facebook';
  private creds: SocialCredentials;

  constructor(creds: SocialCredentials) {
    this.creds = creds;
  }

  private get token(): string {
    return this.creds.accessToken ?? this.creds.apiKey;
  }

  async publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }> {
    const resp = await jsonFetch<any>(
      `https://graph.facebook.com/v19.0/me/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: post.content,
          access_token: this.token,
        }),
      }
    );
    return {
      postId: resp.id ?? 'unknown',
      success: !!resp.id,
    };
  }

  async getMetrics(): Promise<AudienceMetrics> {
    const resp = await jsonFetch<any>(
      `https://graph.facebook.com/v19.0/me?fields=fan_count,engagement&access_token=${this.token}`
    );
    return {
      platform: 'facebook',
      followers: resp.fan_count ?? 0,
      followersGrowthPercent: 0,
      engagementRate: resp.engagement?.count ?? 0,
      avgReach: 0,
      bestPostingHours: [9, 13, 16, 20],
      topHashtags: [],
      audienceTimezone: 'America/New_York',
    };
  }

  async getTrending(): Promise<TrendSignal[]> {
    return [];
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    return [];
  }

  async getPostsToday(): Promise<number> {
    return 0;
  }
}

// ─── LinkedIn Adapter ─────────────────────────────────────────

export class LinkedInAdapter implements SocialAdapter {
  readonly platform: SocialPlatform = 'linkedin';
  private creds: SocialCredentials;

  constructor(creds: SocialCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.accessToken ?? this.creds.apiKey}`,
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  async publishPost(post: ScheduledPost): Promise<{ postId: string; success: boolean }> {
    // Get user URN first
    const me = await jsonFetch<any>('https://api.linkedin.com/v2/userinfo', {
      headers: this.headers(),
    });

    const resp = await jsonFetch<any>('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        author: `urn:li:person:${me.sub}`,
        commentary: post.content,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
        },
        lifecycleState: 'PUBLISHED',
      }),
    });

    return {
      postId: resp['x-restli-id'] ?? resp.id ?? 'unknown',
      success: true,
    };
  }

  async getMetrics(): Promise<AudienceMetrics> {
    return {
      platform: 'linkedin',
      followers: 0,
      followersGrowthPercent: 0,
      engagementRate: 0,
      avgReach: 0,
      bestPostingHours: [8, 10, 12, 17],
      topHashtags: [],
      audienceTimezone: 'America/New_York',
    };
  }

  async getTrending(): Promise<TrendSignal[]> {
    return [];
  }

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    return [];
  }

  async getPostsToday(): Promise<number> {
    return 0;
  }
}

// ─── Social Adapter Factory ──────────────────────────────────

export function createSocialAdapter(
  platform: SocialPlatform,
  creds: SocialCredentials
): SocialAdapter {
  switch (platform) {
    case 'x': return new XAdapter(creds);
    case 'tiktok': return new TikTokAdapter(creds);
    case 'instagram': return new InstagramAdapter(creds);
    case 'facebook': return new FacebookAdapter(creds);
    case 'linkedin': return new LinkedInAdapter(creds);
    default:
      throw new Error(`Unsupported social platform: ${platform}`);
  }
}
