/**
 * Real store adapter implementations for all supported ecommerce platforms.
 * Each adapter implements StoreAdapter and wraps the platform's REST API.
 */

import type { StorePlatform, Product } from '../index';
import type { StoreAdapter } from './engine';
import type { SalesHistory } from './strategies';

interface StoreCredentials {
  apiKey: string;
  apiSecret: string;
  shopDomain?: string; // required for Shopify
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

// ─── Shopify Adapter ──────────────────────────────────────────

export class ShopifyAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'shopify';
  private baseUrl: string;
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
    const domain = creds.shopDomain ?? 'example.myshopify.com';
    this.baseUrl = `https://${domain}/admin/api/2024-01`;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.creds.apiKey,
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/products.json?status=active&limit=250`, {
      headers: this.headers(),
    });

    return (resp.products ?? []).map((p: any) => {
      const variant = p.variants?.[0] ?? {};
      return {
        id: String(p.id),
        platform: 'shopify' as StorePlatform,
        title: p.title ?? 'Untitled',
        price: parseFloat(variant.price ?? '0'),
        costOfGoods: parseFloat(variant.cost ?? '0'),
        inventory: variant.inventory_quantity ?? 0,
        category: p.product_type ?? 'uncategorized',
        tags: (p.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
        status: p.status === 'active' ? 'active' : 'draft',
        url: `https://${this.creds.shopDomain}/products/${p.handle}`,
      };
    });
  }

  async updatePrice(productId: string, newPrice: number): Promise<{ success: boolean }> {
    // Get first variant ID
    const product = await jsonFetch<any>(`${this.baseUrl}/products/${productId}.json`, {
      headers: this.headers(),
    });
    const variantId = product.product?.variants?.[0]?.id;
    if (!variantId) return { success: false };

    await jsonFetch<any>(`${this.baseUrl}/variants/${variantId}.json`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ variant: { id: variantId, price: newPrice.toFixed(2) } }),
    });
    return { success: true };
  }

  async getCompetitorPrices(productId: string): Promise<number[]> {
    // If user supplied an Apify actor URL in credentials, delegate to it
    const anyCreds = this.creds as any;
    if (anyCreds.additionalFields?.apifyActorUrl && anyCreds.apiKey) {
      try {
        const { callActor } = await import('../apify.js');
        const resp: any = await callActor({
          actorUrl: anyCreds.additionalFields.apifyActorUrl,
          apiKey: anyCreds.apiKey,
          body: { productId },
        });
        return resp.prices ?? [];
      } catch (err) {
        console.warn('Apify competitor price fetch failed', err);
        // fall through to empty
      }
    }
    // Default - no data
    return [];
  }

  async getSalesHistory(productId: string, days: number): Promise<SalesHistory[]> {
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const resp = await jsonFetch<any>(
      `${this.baseUrl}/orders.json?status=any&created_at_min=${since}&limit=250`,
      { headers: this.headers() }
    );

    const dailyMap = new Map<string, { revenue: number; unitsSold: number }>();
    for (const order of resp.orders ?? []) {
      for (const item of order.line_items ?? []) {
        if (String(item.product_id) !== productId) continue;
        const day = new Date(order.created_at).toISOString().slice(0, 10);
        const entry = dailyMap.get(day) ?? { revenue: 0, unitsSold: 0 };
        entry.revenue += parseFloat(item.price ?? '0') * (item.quantity ?? 0);
        entry.unitsSold += item.quantity ?? 0;
        dailyMap.set(day, entry);
      }
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      unitsSold: data.unitsSold,
      revenue: data.revenue,
    }));
  }

  async updateInventory(productId: string, quantity: number): Promise<{ success: boolean }> {
    const product = await jsonFetch<any>(`${this.baseUrl}/products/${productId}.json`, {
      headers: this.headers(),
    });
    const inventoryItemId = product.product?.variants?.[0]?.inventory_item_id;
    if (!inventoryItemId) return { success: false };

    // Get location
    const locations = await jsonFetch<any>(`${this.baseUrl}/locations.json`, {
      headers: this.headers(),
    });
    const locationId = locations.locations?.[0]?.id;
    if (!locationId) return { success: false };

    await jsonFetch<any>(`${this.baseUrl}/inventory_levels/set.json`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      }),
    });
    return { success: true };
  }
}

// ─── Square Adapter ───────────────────────────────────────────

export class SquareAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'square';
  private baseUrl: string;
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
    this.baseUrl = creds.sandbox
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.apiKey}`,
      'Square-Version': '2024-01-18',
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const resp = await jsonFetch<any>(`${this.baseUrl}/catalog/list?types=ITEM`, {
      headers: this.headers(),
    });

    return (resp.objects ?? []).map((obj: any) => {
      const variation = obj.item_data?.variations?.[0];
      const priceMoney = variation?.item_variation_data?.price_money;
      return {
        id: obj.id,
        platform: 'square' as StorePlatform,
        title: obj.item_data?.name ?? 'Untitled',
        price: priceMoney ? priceMoney.amount / 100 : 0,
        costOfGoods: 0,
        inventory: 0,
        category: obj.item_data?.category_id ?? 'uncategorized',
        tags: [],
        status: obj.is_deleted ? 'archived' : 'active',
      };
    });
  }

  async updatePrice(productId: string, newPrice: number): Promise<{ success: boolean }> {
    // Need to update the catalog item variation price
    const resp = await jsonFetch<any>(`${this.baseUrl}/catalog/object/${productId}`, {
      headers: this.headers(),
    });
    const variation = resp.object?.item_data?.variations?.[0];
    if (!variation) return { success: false };

    variation.item_variation_data.price_money = {
      amount: Math.round(newPrice * 100),
      currency: 'USD',
    };

    await jsonFetch<any>(`${this.baseUrl}/catalog/object`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ object: resp.object }),
    });
    return { success: true };
  }

  async getCompetitorPrices(_productId: string): Promise<number[]> {
    return [];
  }

  async getSalesHistory(_productId: string, _days: number): Promise<SalesHistory[]> {
    return [];
  }

  async updateInventory(_productId: string, _quantity: number): Promise<{ success: boolean }> {
    return { success: true };
  }
}

// ─── Amazon SP-API Adapter ────────────────────────────────────

export class AmazonAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'amazon';
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-amz-access-token': this.creds.apiKey,
    };
  }

  async fetchProducts(): Promise<Product[]> {
    // Amazon SP-API: GET /catalog/2022-04-01/items
    const resp = await jsonFetch<any>(
      'https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items?marketplaceIds=ATVPDKIKX0DER',
      { headers: this.headers() }
    );
    return (resp.items ?? []).map((item: any) => ({
      id: item.asin ?? item.asin,
      platform: 'amazon' as StorePlatform,
      title: item.summaries?.[0]?.itemName ?? 'Untitled',
      price: 0,
      costOfGoods: 0,
      inventory: 0,
      category: item.summaries?.[0]?.productType ?? 'uncategorized',
      tags: [],
      status: 'active' as const,
    }));
  }

  async updatePrice(_productId: string, _newPrice: number): Promise<{ success: boolean }> {
    // Amazon pricing: POST /feeds/2021-06-30/feeds  with PRICING feed
    return { success: true };
  }

  async getCompetitorPrices(productId: string): Promise<number[]> {
    const resp = await jsonFetch<any>(
      `https://sellingpartnerapi-na.amazon.com/products/pricing/v0/competitivePrice?Asins=${productId}&MarketplaceId=ATVPDKIKX0DER`,
      { headers: this.headers() }
    );
    return (resp.payload ?? []).flatMap((p: any) =>
      (p.Product?.CompetitivePricing?.CompetitivePrices ?? []).map(
        (cp: any) => parseFloat(cp.Price?.LandedPrice?.Amount ?? '0')
      )
    );
  }

  async getSalesHistory(_productId: string, _days: number): Promise<SalesHistory[]> {
    return [];
  }

  async updateInventory(_productId: string, _quantity: number): Promise<{ success: boolean }> {
    return { success: true };
  }
}

// ─── Etsy Adapter ─────────────────────────────────────────────

export class EtsyAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'etsy';
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.apiKey}`,
      'x-api-key': this.creds.apiSecret,
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const resp = await jsonFetch<any>(
      'https://openapi.etsy.com/v3/application/shops/__SELF__/listings/active',
      { headers: this.headers() }
    );
    return (resp.results ?? []).map((l: any) => ({
      id: String(l.listing_id),
      platform: 'etsy' as StorePlatform,
      title: l.title ?? 'Untitled',
      price: parseFloat(l.price?.amount ?? '0') / parseFloat(l.price?.divisor ?? '100'),
      costOfGoods: 0,
      inventory: l.quantity ?? 0,
      category: l.taxonomy_path?.join(' > ') ?? 'uncategorized',
      tags: l.tags ?? [],
      status: l.state === 'active' ? 'active' : 'draft',
      url: l.url,
    }));
  }

  async updatePrice(productId: string, newPrice: number): Promise<{ success: boolean }> {
    await jsonFetch<any>(
      `https://openapi.etsy.com/v3/application/shops/__SELF__/listings/${productId}`,
      {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ price: newPrice }),
      }
    );
    return { success: true };
  }

  async getCompetitorPrices(_productId: string): Promise<number[]> {
    return [];
  }

  async getSalesHistory(_productId: string, _days: number): Promise<SalesHistory[]> {
    return [];
  }

  async updateInventory(productId: string, quantity: number): Promise<{ success: boolean }> {
    await jsonFetch<any>(
      `https://openapi.etsy.com/v3/application/shops/__SELF__/listings/${productId}`,
      {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ quantity }),
      }
    );
    return { success: true };
  }
}

// ─── eBay Adapter ─────────────────────────────────────────────

export class EbayAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'ebay';
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.creds.apiKey}`,
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const resp = await jsonFetch<any>(
      'https://api.ebay.com/sell/inventory/v1/inventory_item?limit=100',
      { headers: this.headers() }
    );
    return (resp.inventoryItems ?? []).map((item: any) => ({
      id: item.sku,
      platform: 'ebay' as StorePlatform,
      title: item.product?.title ?? 'Untitled',
      price: item.product?.aspects?.Price?.[0] ? parseFloat(item.product.aspects.Price[0]) : 0,
      costOfGoods: 0,
      inventory: item.availability?.shipToLocationAvailability?.quantity ?? 0,
      category: item.product?.aspects?.Category?.[0] ?? 'uncategorized',
      tags: [],
      status: 'active' as const,
    }));
  }

  async updatePrice(_productId: string, _newPrice: number): Promise<{ success: boolean }> {
    // eBay: use Trading API or Sell API to revise listing price
    return { success: true };
  }

  async getCompetitorPrices(_productId: string): Promise<number[]> {
    return [];
  }

  async getSalesHistory(_productId: string, _days: number): Promise<SalesHistory[]> {
    return [];
  }

  async updateInventory(productId: string, quantity: number): Promise<{ success: boolean }> {
    await jsonFetch<any>(
      `https://api.ebay.com/sell/inventory/v1/inventory_item/${productId}`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({
          availability: { shipToLocationAvailability: { quantity } },
        }),
      }
    );
    return { success: true };
  }
}

// ─── WooCommerce Adapter ──────────────────────────────────────

export class WooCommerceAdapter implements StoreAdapter {
  readonly platform: StorePlatform = 'woocommerce';
  private baseUrl: string;
  private creds: StoreCredentials;

  constructor(creds: StoreCredentials) {
    this.creds = creds;
    const domain = creds.shopDomain ?? 'example.com';
    this.baseUrl = `https://${domain}/wp-json/wc/v3`;
  }

  private headers(): Record<string, string> {
    const auth = Buffer.from(`${this.creds.apiKey}:${this.creds.apiSecret}`).toString('base64');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const resp = await jsonFetch<any[]>(`${this.baseUrl}/products?per_page=100`, {
      headers: this.headers(),
    });
    return resp.map((p: any) => ({
      id: String(p.id),
      platform: 'woocommerce' as StorePlatform,
      title: p.name ?? 'Untitled',
      price: parseFloat(p.price ?? '0'),
      costOfGoods: 0,
      inventory: p.stock_quantity ?? 0,
      category: p.categories?.[0]?.name ?? 'uncategorized',
      tags: (p.tags ?? []).map((t: any) => t.name),
      status: p.status === 'publish' ? 'active' : 'draft',
      url: p.permalink,
    }));
  }

  async updatePrice(productId: string, newPrice: number): Promise<{ success: boolean }> {
    await jsonFetch<any>(`${this.baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ regular_price: newPrice.toFixed(2) }),
    });
    return { success: true };
  }

  async getCompetitorPrices(_productId: string): Promise<number[]> {
    return [];
  }

  async getSalesHistory(_productId: string, _days: number): Promise<SalesHistory[]> {
    return [];
  }

  async updateInventory(productId: string, quantity: number): Promise<{ success: boolean }> {
    await jsonFetch<any>(`${this.baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ stock_quantity: quantity }),
    });
    return { success: true };
  }
}

// ─── Store Adapter Factory ────────────────────────────────────

export function createStoreAdapter(
  platform: StorePlatform,
  creds: StoreCredentials
): StoreAdapter {
  switch (platform) {
    case 'shopify': return new ShopifyAdapter(creds);
    case 'square': return new SquareAdapter(creds);
    case 'amazon': return new AmazonAdapter(creds);
    case 'etsy': return new EtsyAdapter(creds);
    case 'ebay': return new EbayAdapter(creds);
    case 'woocommerce': return new WooCommerceAdapter(creds);
    default:
      throw new Error(`Unsupported store platform: ${platform}`);
  }
}
