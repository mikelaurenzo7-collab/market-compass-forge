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
  },
  {
    id: 'store',
    icon: <ShoppingCart size={28} />,
    title: 'Store Operators',
    desc: 'Dynamic pricing, inventory forecasting, listing optimization, and catalog sync across your entire storefront.',
    tags: ['Shopify', 'Amazon', 'Etsy', 'Dynamic Pricing', 'Inventory'],
    color: 'var(--color-store)',
  },
  {
    id: 'social',
    icon: <Share2 size={28} />,
    title: 'Social Operators',
    desc: 'Smart content scheduling, engagement algorithms, audience analytics, and cross-platform amplification.',
    tags: ['X / Twitter', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn'],
    color: 'var(--color-social)',
  },
  {
    id: 'workforce',
    icon: <Users size={28} />,
    title: 'Workforce Pods',
    desc: 'Orchestrate multi-agent teams for hiring, onboarding, support triage, and knowledge management workflows.',
    tags: ['Slack', 'Notion', 'Jira', 'Asana', 'HubSpot'],
    color: 'var(--color-workforce)',
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
              <div className="family-showcase-tags">
                {fam.tags.map((t) => (
                  <span key={t} className="family-showcase-tag">{t}</span>
                ))}
              </div>
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
        &copy; {new Date().getFullYear()} BeastBots. All rights reserved.
      </footer>
    </div>
  );
}