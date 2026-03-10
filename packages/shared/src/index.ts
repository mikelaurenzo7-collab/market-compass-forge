export type BotFamily = 'trading' | 'store' | 'social' | 'workforce';

export type IntegrationCategory = 'trading' | 'ecommerce' | 'social';

export interface IntegrationDefinition {
  id: string;
  category: IntegrationCategory;
  displayName: string;
  oauth: boolean;
  status: 'planned' | 'beta' | 'ga';
}

export interface PricingPlan {
  family: BotFamily;
  tier: 'starter' | 'pro' | 'enterprise';
  monthlyUsd: number;
  includedUsageUsd: number;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  { id: 'coinbase', category: 'trading', displayName: 'Coinbase', oauth: true, status: 'beta' },
  { id: 'binance', category: 'trading', displayName: 'Binance', oauth: true, status: 'beta' },
  { id: 'kalshi', category: 'trading', displayName: 'Kalshi', oauth: true, status: 'beta' },
  { id: 'polymarket', category: 'trading', displayName: 'Polymarket', oauth: true, status: 'planned' },
  { id: 'alpaca', category: 'trading', displayName: 'Alpaca', oauth: true, status: 'beta' },
  { id: 'shopify', category: 'ecommerce', displayName: 'Shopify', oauth: true, status: 'beta' },
  { id: 'amazon', category: 'ecommerce', displayName: 'Amazon', oauth: true, status: 'planned' },
  { id: 'etsy', category: 'ecommerce', displayName: 'Etsy', oauth: true, status: 'planned' },
  { id: 'square', category: 'ecommerce', displayName: 'Square', oauth: true, status: 'beta' },
  { id: 'woocommerce', category: 'ecommerce', displayName: 'WooCommerce', oauth: true, status: 'planned' },
  { id: 'ebay', category: 'ecommerce', displayName: 'eBay', oauth: true, status: 'planned' },
  { id: 'x', category: 'social', displayName: 'X / Twitter', oauth: true, status: 'beta' },
  { id: 'tiktok', category: 'social', displayName: 'TikTok', oauth: true, status: 'planned' },
  { id: 'instagram', category: 'social', displayName: 'Instagram', oauth: true, status: 'planned' },
  { id: 'facebook', category: 'social', displayName: 'Facebook', oauth: true, status: 'planned' },
  { id: 'linkedin', category: 'social', displayName: 'LinkedIn', oauth: true, status: 'planned' }
];

export const DEFAULT_PRICING: PricingPlan[] = [
  { family: 'trading', tier: 'starter', monthlyUsd: 399, includedUsageUsd: 75 },
  { family: 'trading', tier: 'pro', monthlyUsd: 1249, includedUsageUsd: 300 },
  { family: 'store', tier: 'starter', monthlyUsd: 249, includedUsageUsd: 50 },
  { family: 'store', tier: 'pro', monthlyUsd: 799, includedUsageUsd: 150 },
  { family: 'social', tier: 'starter', monthlyUsd: 149, includedUsageUsd: 25 },
  { family: 'social', tier: 'pro', monthlyUsd: 499, includedUsageUsd: 75 },
  { family: 'workforce', tier: 'starter', monthlyUsd: 999, includedUsageUsd: 200 },
  { family: 'workforce', tier: 'pro', monthlyUsd: 2999, includedUsageUsd: 500 }
];
