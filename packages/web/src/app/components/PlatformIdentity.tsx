'use client';

import {
  TrendingUp, ShoppingCart, Share2, Users,
  DollarSign, BarChart3, Package, Star, MessageSquare, Heart,
  Eye, Zap, Target, Activity, Globe, Hash,
} from 'lucide-react';

/* ─── Platform Brand Colors ─── */

export const PLATFORM_BRANDS: Record<string, {
  name: string;
  color: string;
  dimColor: string;
  icon: string;
  tagline: string;
  family: string;
}> = {
  /* Trading */
  coinbase:    { name: 'Coinbase',      color: '#0052FF', dimColor: 'rgba(0,82,255,0.12)',    icon: '◆',  tagline: 'Crypto exchange',          family: 'trading' },
  binance:     { name: 'Binance',       color: '#F0B90B', dimColor: 'rgba(240,185,11,0.12)',   icon: '◈',  tagline: 'Global crypto exchange',   family: 'trading' },
  alpaca:      { name: 'Alpaca',        color: '#FFDC00', dimColor: 'rgba(255,220,0,0.12)',    icon: '▲',  tagline: 'Commission-free stocks',   family: 'trading' },
  kraken:      { name: 'Kraken',        color: '#5741D9', dimColor: 'rgba(87,65,217,0.12)',    icon: '⬡',  tagline: 'Crypto exchange',          family: 'trading' },
  kalshi:      { name: 'Kalshi',        color: '#00D395', dimColor: 'rgba(0,211,149,0.12)',    icon: '⬢',  tagline: 'Event contracts',          family: 'trading' },
  polymarket:  { name: 'Polymarket',    color: '#0066FF', dimColor: 'rgba(0,102,255,0.12)',    icon: '⬟',  tagline: 'Prediction markets',       family: 'trading' },
  robinhood:   { name: 'Robinhood',     color: '#00C805', dimColor: 'rgba(0,200,5,0.12)',      icon: '⊙',  tagline: 'Stocks & crypto',          family: 'trading' },

  /* Store */
  shopify:     { name: 'Shopify',       color: '#95BF47', dimColor: 'rgba(149,191,71,0.12)',   icon: '🛍', tagline: 'Your online store',        family: 'store' },
  amazon:      { name: 'Amazon',        color: '#FF9900', dimColor: 'rgba(255,153,0,0.12)',    icon: '📦', tagline: 'Marketplace giant',        family: 'store' },
  etsy:        { name: 'Etsy',          color: '#F1641E', dimColor: 'rgba(241,100,30,0.12)',   icon: '🎨', tagline: 'Handmade & vintage',       family: 'store' },
  ebay:        { name: 'eBay',          color: '#E53238', dimColor: 'rgba(229,50,56,0.12)',    icon: '🏷️', tagline: 'Global marketplace',       family: 'store' },
  square:      { name: 'Square',        color: '#006AFF', dimColor: 'rgba(0,106,255,0.12)',    icon: '◼',  tagline: 'In-person & online',       family: 'store' },
  woocommerce: { name: 'WooCommerce',   color: '#96588A', dimColor: 'rgba(150,88,138,0.12)',   icon: '🔌', tagline: 'WordPress commerce',       family: 'store' },

  /* Social */
  x:           { name: '𝕏',             color: '#A0A0A0', dimColor: 'rgba(160,160,160,0.12)',  icon: '𝕏',  tagline: 'Posts & threads',          family: 'social' },
  tiktok:      { name: 'TikTok',        color: '#FE2C55', dimColor: 'rgba(254,44,85,0.12)',    icon: '♪',  tagline: 'Short-form video',         family: 'social' },
  instagram:   { name: 'Instagram',     color: '#E4405F', dimColor: 'rgba(228,64,95,0.12)',    icon: '📷', tagline: 'Visual storytelling',      family: 'social' },
  facebook:    { name: 'Facebook',      color: '#1877F2', dimColor: 'rgba(24,119,242,0.12)',   icon: 'f',  tagline: 'Social networking',        family: 'social' },
  linkedin:    { name: 'LinkedIn',      color: '#0A66C2', dimColor: 'rgba(10,102,194,0.12)',   icon: 'in', tagline: 'Professional network',     family: 'social' },
  youtube:     { name: 'YouTube',       color: '#FF0000', dimColor: 'rgba(255,0,0,0.12)',      icon: '▶',  tagline: 'Video content',            family: 'social' },

  /* Workforce */
  slack:       { name: 'Slack',         color: '#4A154B', dimColor: 'rgba(74,21,75,0.12)',     icon: '#',  tagline: 'Team messaging',           family: 'workforce' },
  teams:       { name: 'Teams',         color: '#6264A7', dimColor: 'rgba(98,100,167,0.12)',   icon: '⊞',  tagline: 'Collaboration hub',        family: 'workforce' },
  notion:      { name: 'Notion',        color: '#FFFFFF', dimColor: 'rgba(255,255,255,0.08)',   icon: '◧',  tagline: 'All-in-one workspace',     family: 'workforce' },
  jira:        { name: 'Jira',          color: '#0052CC', dimColor: 'rgba(0,82,204,0.12)',     icon: '◈',  tagline: 'Project tracking',         family: 'workforce' },
  github:      { name: 'GitHub',        color: '#F0F6FC', dimColor: 'rgba(240,246,252,0.08)',   icon: '⊛',  tagline: 'Code collaboration',       family: 'workforce' },
  salesforce:  { name: 'Salesforce',    color: '#00A1E0', dimColor: 'rgba(0,161,224,0.12)',    icon: '☁',  tagline: 'CRM platform',             family: 'workforce' },
  hubspot:     { name: 'HubSpot',       color: '#FF7A59', dimColor: 'rgba(255,122,89,0.12)',   icon: '⊕',  tagline: 'Marketing & CRM',          family: 'workforce' },
  gmail:       { name: 'Gmail',         color: '#EA4335', dimColor: 'rgba(234,67,53,0.12)',    icon: '✉',  tagline: 'Email automation',         family: 'workforce' },
};

/* ─── Family Config ─── */

export const FAMILY_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  label: string;
  cssVar: string;
  verb: string;
  metricsLabels: string[];
}> = {
  trading: {
    icon: <TrendingUp size={16} />,
    color: '#00e87b',
    label: 'Trading',
    cssVar: 'var(--color-trading)',
    verb: 'Trading',
    metricsLabels: ['P&L', 'Win Rate', 'Trades', 'Positions'],
  },
  store: {
    icon: <ShoppingCart size={16} />,
    color: '#3b82f6',
    label: 'Store',
    cssVar: 'var(--color-store)',
    verb: 'Managing',
    metricsLabels: ['Revenue', 'Orders', 'Listings', 'Avg Price'],
  },
  social: {
    icon: <Share2 size={16} />,
    color: '#8b5cf6',
    label: 'Social',
    cssVar: 'var(--color-social)',
    verb: 'Publishing',
    metricsLabels: ['Engagement', 'Posts', 'Followers', 'Reach'],
  },
  workforce: {
    icon: <Users size={16} />,
    color: '#f59e0b',
    label: 'Workforce',
    cssVar: 'var(--color-workforce)',
    verb: 'Automating',
    metricsLabels: ['Tasks Done', 'Active', 'Efficiency', 'SLA'],
  },
};

/* ─── Strategy Display Names & Icons ─── */

export const STRATEGY_META: Record<string, { icon: React.ReactNode; label: string; short: string }> = {
  /* Trading */
  dca:                    { icon: <DollarSign size={12} />,      label: 'Dollar Cost Average',   short: 'DCA' },
  momentum:               { icon: <TrendingUp size={12} />,      label: 'Momentum',              short: 'MOM' },
  mean_reversion:         { icon: <Activity size={12} />,        label: 'Mean Reversion',        short: 'MR' },
  grid:                   { icon: <BarChart3 size={12} />,       label: 'Grid Trading',          short: 'GRID' },
  arbitrage:              { icon: <Zap size={12} />,             label: 'Arbitrage',             short: 'ARB' },
  market_making:          { icon: <Target size={12} />,          label: 'Market Making',         short: 'MM' },
  event_probability:      { icon: <Eye size={12} />,             label: 'Event Probability',     short: 'EVT' },
  /* Store */
  dynamic_pricing:        { icon: <DollarSign size={12} />,      label: 'Dynamic Pricing',       short: 'PRICE' },
  inventory_forecast:     { icon: <Package size={12} />,         label: 'Inventory Forecast',    short: 'INV' },
  listing_optimization:   { icon: <Star size={12} />,            label: 'Listing Optimization',  short: 'LIST' },
  competitor_monitoring:  { icon: <Eye size={12} />,             label: 'Competitor Monitor',    short: 'COMP' },
  cross_platform_sync:    { icon: <Globe size={12} />,           label: 'Cross-Platform Sync',   short: 'SYNC' },
  review_management:      { icon: <MessageSquare size={12} />,   label: 'Review Management',     short: 'REV' },
  /* Social */
  content_calendar:       { icon: <BarChart3 size={12} />,       label: 'Content Calendar',      short: 'CAL' },
  engagement_automation:  { icon: <Heart size={12} />,           label: 'Engagement Auto',       short: 'ENG' },
  trend_detection:        { icon: <TrendingUp size={12} />,      label: 'Trend Detection',       short: 'TREND' },
  audience_analytics:     { icon: <Eye size={12} />,             label: 'Audience Analytics',    short: 'AUD' },
  hashtag_optimization:   { icon: <Hash size={12} />,            label: 'Hashtag Optimization',  short: 'HASH' },
  cross_post_optimization:{ icon: <Globe size={12} />,           label: 'Cross-Post',            short: 'XPOST' },
  /* Workforce */
  task_triage:            { icon: <Target size={12} />,          label: 'Task Triage',           short: 'TRIAGE' },
  report_generation:      { icon: <BarChart3 size={12} />,       label: 'Report Generation',     short: 'RPT' },
  escalation_routing:     { icon: <Zap size={12} />,             label: 'Escalation Routing',    short: 'ESC' },
  onboarding_automation:  { icon: <Users size={12} />,           label: 'Onboarding Auto',       short: 'ONBD' },
  data_sync:              { icon: <Globe size={12} />,           label: 'Data Sync',             short: 'SYNC' },
  compliance_monitoring:  { icon: <Eye size={12} />,             label: 'Compliance Monitor',    short: 'COMP' },
};

/* ─── Helper Components ─── */

export function PlatformLogo({ platform, size = 32 }: { platform: string; size?: number }) {
  const brand = PLATFORM_BRANDS[platform];
  if (!brand) return null;

  return (
    <div
      className="platform-logo-badge"
      style={{
        width: size,
        height: size,
        borderRadius: size > 24 ? 10 : 6,
        background: brand.dimColor,
        border: `1px solid ${brand.color}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        fontWeight: 800,
        color: brand.color,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
      title={brand.name}
    >
      {brand.icon}
    </div>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const brand = PLATFORM_BRANDS[platform];
  if (!brand) return <span className="strategy-tag">{platform}</span>;

  return (
    <span
      className="platform-badge-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: '0.68rem',
        fontWeight: 700,
        background: brand.dimColor,
        color: brand.color,
        border: `1px solid ${brand.color}20`,
      }}
    >
      <span style={{ fontSize: '0.72rem' }}>{brand.icon}</span>
      {brand.name}
    </span>
  );
}

export function StrategyPill({ strategy }: { strategy: string }) {
  const meta = STRATEGY_META[strategy];
  if (!meta) return <span className="strategy-tag">{strategy.replace(/_/g, ' ')}</span>;

  return (
    <span className="strategy-pill" title={meta.label}>
      {meta.icon}
      <span>{meta.short}</span>
    </span>
  );
}

export function getPlatformBrand(platform: string) {
  return PLATFORM_BRANDS[platform] ?? {
    name: platform,
    color: '#888',
    dimColor: 'rgba(136,136,136,0.12)',
    icon: '●',
    tagline: '',
    family: 'trading',
  };
}

export function getFamilyConfig(family: string) {
  return FAMILY_CONFIG[family] ?? FAMILY_CONFIG.trading;
}
