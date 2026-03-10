import { DEFAULT_PRICING } from '@beastbots/shared';
import type { BotFamily, PricingPlan } from '@beastbots/shared';

export function pricingSummary(): PricingPlan[] {
  return DEFAULT_PRICING;
}

export function pricingByFamily(family: BotFamily): PricingPlan[] {
  return DEFAULT_PRICING.filter((p) => p.family === family);
}

export function getPlanPrice(family: BotFamily, tier: PricingPlan['tier']): PricingPlan | undefined {
  return DEFAULT_PRICING.find((p) => p.family === family && p.tier === tier);
}
