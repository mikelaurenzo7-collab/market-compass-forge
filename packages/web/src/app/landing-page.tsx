'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingCart,
  Share2,
  Users,
  Shield,
  Zap,
  BarChart3,
  Bot,
  ArrowRight,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
} from 'lucide-react';

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const FAMILIES = [
  {
    id: 'trading',
    icon: <TrendingUp size={28} />,
    title: 'Trading Operators',
    desc: 'Execute momentum, mean-reversion, and arbitrage strategies across crypto and equities with real-time risk management.',
    tags: ['StochRSI', 'ADX', 'Paper Mode', 'Alpaca', 'Binance'],
    color: 'var(--color-trading)',
    platforms: [
      { name: 'Coinbase', color: '#0052FF', icon: '◆' },
      { name: 'Binance', color: '#F0B90B', icon: '◈' },
      { name: 'Alpaca', color: '#FFDC00', icon: '▲' },
      { name: 'Kalshi', color: '#00D395', icon: '⬢' },
      { name: 'Polymarket', color: '#0066FF', icon: '⬟' },
    ],
    metrics: ['P&L Tracking', 'Win Rate', 'Position Sizing', 'Risk Controls'],
  },
  {
    id: 'store',
    icon: <ShoppingCart size={28} />,
    title: 'Store Operators',
    desc: 'Dynamic pricing, inventory forecasting, listing optimization, and catalog sync across your entire storefront.',
    tags: ['Shopify', 'Amazon', 'Etsy', 'Dynamic Pricing', 'Inventory'],
    color: 'var(--color-store)',
    platforms: [
      { name: 'Shopify', color: '#95BF47', icon: '🛍' },
      { name: 'Amazon', color: '#FF9900', icon: '📦' },
      { name: 'Etsy', color: '#F1641E', icon: '🎨' },
      { name: 'eBay', color: '#E53238', icon: '🏷️' },
      { name: 'Square', color: '#006AFF', icon: '◼' },
      { name: 'WooCommerce', color: '#96588A', icon: '🔌' },
    ],
    metrics: ['Revenue Impact', 'Price Changes', 'Stock Alerts', 'Review Responses'],
  },
  {
    id: 'social',
    icon: <Share2 size={28} />,
    title: 'Social Operators',
    desc: 'Smart content scheduling, engagement algorithms, audience analytics, and cross-platform amplification.',
    tags: ['X / Twitter', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn'],
    color: 'var(--color-social)',
    platforms: [
      { name: '𝕏', color: '#A0A0A0', icon: '𝕏' },
      { name: 'TikTok', color: '#FE2C55', icon: '♪' },
      { name: 'Instagram', color: '#E4405F', icon: '📷' },
      { name: 'Facebook', color: '#1877F2', icon: 'f' },
      { name: 'LinkedIn', color: '#0A66C2', icon: 'in' },
      { name: 'YouTube', color: '#FF0000', icon: '▶' },
    ],
    metrics: ['Engagement Rate', 'Follower Growth', 'Post Reach', 'Trend Alerts'],
  },
  {
    id: 'workforce',
    icon: <Users size={28} />,
    title: 'Workforce Pods',
    desc: 'Orchestrate multi-agent teams for hiring, onboarding, support triage, and knowledge management workflows.',
    tags: ['Slack', 'Notion', 'Jira', 'Asana', 'HubSpot'],
    color: 'var(--color-workforce)',
    platforms: [
      { name: 'Slack', color: '#4A154B', icon: '#' },
      { name: 'Notion', color: '#FFFFFF', icon: '◧' },
      { name: 'Jira', color: '#0052CC', icon: '◈' },
      { name: 'Salesforce', color: '#00A1E0', icon: '☁' },
      { name: 'HubSpot', color: '#FF7A59', icon: '⊕' },
    ],
    metrics: ['Tasks Done', 'SLA Compliance', 'Response Time', 'Escalations'],
  },
];

const FEATURES = [
  {
    icon: <Shield size={20} />,
    title: '5-Layer Safety Model',
    desc: 'Budget caps, circuit breakers, human-in-the-loop approvals, kill switches, and full audit trails.',
    variant: 'green' as const,
  },
  {
    icon: <Zap size={20} />,
    title: 'Real-Time Execution',
    desc: 'Cloudflare Durable Objects provide low-latency, always-on bot runtimes at the edge — globally.',
    variant: 'blue' as const,
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Meaningful Analytics',
    desc: 'Track P&L, success rates, latency, and sentiment scores with interactive charts and sparklines.',
    variant: 'purple' as const,
  },
  {
    icon: <Bot size={20} />,
    title: 'AI-Powered Decisions',
    desc: 'Multi-provider LLM router (OpenAI, Anthropic, Grok) with structured prompts and automatic failover.',
    variant: 'gold' as const,
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ─── Navigation ─── */}
      <nav className="landing-nav">
        <Link href="/" className="landing-brand">BeastBots</Link>
        <div className="landing-nav-links">
          <Link href="/pricing" className="landing-nav-link">Pricing</Link>
          <Link href="/login" className="landing-nav-link">Log in</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="hero">
        <div className="hero-glow green" />
        <div className="hero-glow purple" />
        <div className="hero-glow blue" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <motion.div variants={fade} className="hero-badge">
            <span className="hero-badge-dot" />
            Now with multi-provider AI routing
          </motion.div>

          <motion.h1 variants={fade} className="hero-title">
            Autonomous operators that{' '}
            <span className="hero-title-gradient">run like beasts</span>
          </motion.h1>

          <motion.p variants={fade} className="hero-desc">
            Deploy self-driving bots for trading, ecommerce, social media, and workforce
            automation — with built-in safety, real-time analytics, and edge-native execution.
          </motion.p>

          <motion.div variants={fade} className="hero-actions">
            <Link href="/signup" className="hero-btn-primary">
              <Sparkles size={16} />
              Start for free
              <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="hero-btn-secondary">
              View pricing
            </Link>
          </motion.div>
        </motion.div>

        {/* Live stat ticker */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          style={{
            display: 'flex',
            gap: '48px',
            marginTop: '80px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            { label: 'Bots Deployed', value: '2,400+' },
            { label: 'Trades Executed', value: '1.2M' },
            { label: 'Uptime', value: '99.97%' },
            { label: 'Platforms', value: '16' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--green)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features ─── */}
      <section className="features-section">
        <motion.div
          className="features-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fade} className="feature-card">
              <div className={`feature-icon ${f.variant}`}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Bot Families ─── */}
      <section className="families-section">
        <div className="families-heading">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Four operator families. One command center.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Each family has purpose-built strategies, platform adapters, and safety controls.
          </motion.p>
        </div>

        <motion.div
          className="family-showcase-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {FAMILIES.map((fam) => (
            <motion.div
              key={fam.id}
              variants={fade}
              className={`family-showcase-card ${fam.id}`}
            >
              <div className="family-showcase-icon" style={{ color: fam.color }}>
                {fam.icon}
              </div>
              <div className="family-showcase-title" style={{ color: fam.color }}>
                {fam.title}
              </div>
              <div className="family-showcase-desc">{fam.desc}</div>

              {/* Platform badges with brand colors */}
              <div className="family-showcase-platforms">
                {fam.platforms.map((p) => (
                  <span
                    key={p.name}
                    className="platform-brand-badge"
                    style={{
                      '--pb-color': p.color,
                      '--pb-bg': `${p.color}15`,
                    } as React.CSSProperties}
                  >
                    <span className="platform-brand-icon">{p.icon}</span>
                    {p.name}
                  </span>
                ))}
              </div>

              {/* Key metrics this family tracks */}
              <div className="family-showcase-metrics">
                {fam.metrics.map((m) => (
                  <span key={m} className="family-metric-tag">
                    <CheckCircle2 size={10} /> {m}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Platform Logos ─── */}
      <motion.div
        className="platform-logos"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {[
          { name: 'Coinbase', color: '#0052FF' },
          { name: 'Binance', color: '#F0B90B' },
          { name: 'Alpaca', color: '#FFDC00' },
          { name: 'Shopify', color: '#95BF47' },
          { name: 'Amazon', color: '#FF9900' },
          { name: 'Etsy', color: '#F1641E' },
          { name: '𝕏', color: '#A0A0A0' },
          { name: 'Instagram', color: '#E4405F' },
          { name: 'TikTok', color: '#FE2C55' },
          { name: 'LinkedIn', color: '#0A66C2' },
          { name: 'YouTube', color: '#FF0000' },
          { name: 'Slack', color: '#4A154B' },
          { name: 'Notion', color: '#FFFFFF' },
          { name: 'Jira', color: '#0052CC' },
        ].map((p) => (
          <span key={p.name} className="platform-logo" style={{ color: p.color, opacity: 0.8 }}>{p.name}</span>
        ))}
      </motion.div>

      {/* ─── Trust Badges ─── */}
      <section className="trust-section">
        <motion.div
          className="trust-badges"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          {[
            { icon: <Lock size={14} />, text: 'AES-256 Encrypted' },
            { icon: <Shield size={14} />, text: '5-Layer Safety Model' },
            { icon: <Eye size={14} />, text: 'Full Audit Trail' },
            { icon: <CheckCircle2 size={14} />, text: 'Paper Mode First' },
            { icon: <Clock size={14} />, text: '99.97% Uptime' },
            { icon: <Bot size={14} />, text: '16 Platforms Supported' },
          ].map((b) => (
            <motion.div key={b.text} variants={fade} className="trust-badge">
              {b.icon}
              {b.text}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="how-section">
        <motion.div
          className="how-heading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Live in three steps</h2>
          <p>From signup to a running bot in under 2 minutes.</p>
        </motion.div>

        <motion.div
          className="how-steps"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          {[
            { num: '1', title: 'Connect your platform', desc: 'Link your exchange, store, or social account with API keys or OAuth. Credentials are encrypted with AES-256.' },
            { num: '2', title: 'Choose a strategy', desc: 'Pick from battle-tested templates — DCA, momentum, dynamic pricing, content calendar — or build your own config.' },
            { num: '3', title: 'Deploy & monitor', desc: 'Start in paper mode with zero risk. Watch your bot execute in real-time. Upgrade to live when ready.' },
          ].map((step) => (
            <motion.div key={step.num} variants={fade} className="how-step">
              <div className="how-step-number">{step.num}</div>
              <div className="how-step-title">{step.title}</div>
              <div className="how-step-desc">{step.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="comparison-section">
        <motion.div
          className="comparison-heading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Why teams choose BeastBots</h2>
          <p>The only platform that unifies trading, ecommerce, social, and workforce automation.</p>
        </motion.div>

        <motion.table
          className="comparison-table"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <thead>
            <tr>
              <th>Feature</th>
              <th>BeastBots</th>
              <th>3Commas</th>
              <th>Pionex</th>
              <th>Buffer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Trading bots</td>
              <td className="highlight">7 strategies</td>
              <td>DCA, Grid</td>
              <td>Grid, DCA</td>
              <td className="muted">—</td>
            </tr>
            <tr>
              <td>Ecommerce automation</td>
              <td className="highlight">6 strategies</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
            </tr>
            <tr>
              <td>Social media bots</td>
              <td className="highlight">6 strategies</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
              <td>Scheduling only</td>
            </tr>
            <tr>
              <td>Workforce automation</td>
              <td className="highlight">6 strategies</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
            </tr>
            <tr>
              <td>Safety model</td>
              <td className="highlight">5-layer</td>
              <td>Stop-loss</td>
              <td>Stop-loss</td>
              <td className="muted">—</td>
            </tr>
            <tr>
              <td>AI-powered decisions</td>
              <td className="highlight">Multi-LLM</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
              <td>AI assist</td>
            </tr>
            <tr>
              <td>Paper mode</td>
              <td className="highlight">All families</td>
              <td>Trading only</td>
              <td>Trading only</td>
              <td className="muted">—</td>
            </tr>
            <tr>
              <td>Unified dashboard</td>
              <td className="highlight">All bots, one view</td>
              <td>Trading only</td>
              <td>Trading only</td>
              <td>Social only</td>
            </tr>
          </tbody>
        </motion.table>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <motion.div
          className="faq-heading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know before deploying your first bot.</p>
        </motion.div>

        <motion.div
          className="faq-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          {[
            {
              q: 'Is my money safe?',
              a: 'Yes. We never hold your funds. Bots operate through your exchange/store API keys, which you control. We enforce budget caps, circuit breakers, and kill switches. Plus, every bot starts in paper mode by default.',
            },
            {
              q: 'Can I lose money trading?',
              a: 'Yes — all trading involves risk. No strategy guarantees profits. We strongly recommend starting in paper mode, using stop-losses, and setting conservative position sizes. Read our full risk disclaimer.',
            },
            {
              q: 'How is BeastBots different from 3Commas or Pionex?',
              a: 'BeastBots is the only platform that unifies trading, ecommerce, social media, and workforce bots in a single dashboard. Others only do trading. We also have a 5-layer safety model with human-in-the-loop approvals that competitors lack.',
            },
            {
              q: 'Do I need coding experience?',
              a: 'No. Choose from pre-built strategy templates, connect your accounts, and deploy. Advanced users can customize indicators, thresholds, and risk parameters — but templates work out of the box.',
            },
            {
              q: 'What exchanges and platforms do you support?',
              a: 'Trading: Coinbase, Binance, Alpaca, Kalshi, Polymarket. Stores: Shopify, Amazon, Etsy, eBay, Square. Social: X, Instagram, TikTok, LinkedIn, YouTube. Workforce: Slack, Notion, Jira, and more.',
            },
            {
              q: 'What is paper mode?',
              a: 'Paper mode simulates bot execution against real market data without placing actual trades or making real changes. It lets you test strategies risk-free before going live. Every bot starts in paper mode.',
            },
            {
              q: 'Can I run multiple bots?',
              a: 'Yes. Each bot operates independently on its own account/store. Our Pro and Enterprise plans support multiple bots with volume pricing. One bot = one dedicated operator for maximum performance.',
            },
            {
              q: 'Is my data private?',
              a: 'Absolutely. Each account is isolated in its own tenant. We never share data across accounts, never sell data, and never train AI on your individual strategies. API keys are encrypted with AES-256-GCM.',
            },
          ].map((item) => (
            <motion.div key={item.q} variants={fade} className="faq-item">
              <div className="faq-question"><HelpCircle size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom', color: 'var(--green)' }} />{item.q}</div>
              <div className="faq-answer">{item.a}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Ready to deploy your first beast?</h2>
          <p className="cta-desc">
            Start in paper mode with zero risk. Upgrade when you&apos;re ready to go live.
          </p>
          <Link href="/signup" className="hero-btn-primary">
            <Sparkles size={16} />
            Get started free
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="legal-footer-links">
          <Link href="/templates">Templates</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} BeastBots. All rights reserved.</p>
      </footer>
    </div>
  );
}