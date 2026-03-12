
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, Zap, BarChart3, Bot, ArrowRight, Sparkles, Lock, CheckCircle2, Clock, Eye, HelpCircle, DollarSign, AlertTriangle, UserCheck, PowerOff, ListChecks
} from 'lucide-react';

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.15 } } };

const SAFETY_LAYERS = [
  {
    icon: <DollarSign size={28} />,
    title: 'Layer 1: Budget Caps',
    desc: 'Set hard limits on how much a bot can spend per day and per individual action. This is your first line of defense against overspending, ensuring bots operate strictly within your financial boundaries.',
    details: [
      'Max Daily Spend (USD): The total amount a bot can use in a 24-hour period.',
      'Max Per-Action Spend (USD): The maximum for any single trade, purchase, or bid.',
      'Warning Thresholds: Receive alerts when you approach your set limits.',
    ],
    color: 'var(--color-green)',
  },
  {
    icon: <AlertTriangle size={28} />,
    title: 'Layer 2: Circuit Breakers',
    desc: 'Protect your account from black swan events or buggy strategies. The system automatically halts a bot if it detects an unusual rate of errors or losses, preventing a bad situation from getting worse.',
    details: [
      'Max Consecutive Errors: Pauses the bot after a specific number of failed actions in a row.',
      'Max Error Rate: Trips if the percentage of errors in a given time window exceeds a threshold.',
      'Automatic Cooldown: After a circuit breaker is tripped, the bot enters a mandatory cooldown period.',
    ],
    color: 'var(--color-orange)',
  },
  {
    icon: <UserCheck size={28} />,
    title: 'Layer 3: Human-in-the-Loop',
    desc: 'Certain actions can be configured to require your explicit approval before execution. You maintain ultimate control over sensitive operations, from large trades to sending external communications.',
    details: [
      'Configurable Approvals: Decide which actions require a manual check.',
      'Multi-Factor Confirmation: Secure approvals via email or a mobile app push notification.',
      'Context-Rich Requests: Get all the data you need to make an informed approve/deny decision.',
    ],
    color: 'var(--color-blue)',
  },
  {
    icon: <PowerOff size={28} />,
    title: 'Layer 4: Kill Switches',
    desc: 'Immediately and irrevocably halt any or all bot activity with a single click. The master kill switch provides a foolproof way to stop everything, ensuring you can intervene instantly if you notice any unexpected behavior.',
    details: [
      'Per-Bot Kill Switch: Instantly stop a single misbehaving bot.',
      'Family-Wide Kill Switch: Halt all bots of a specific type (e.g., all trading bots).',
      'Global Kill Switch: A master override to cease all activity across your entire account.',
    ],
    color: 'var(--color-red)',
  },
  {
    icon: <ListChecks size={28} />,
    title: 'Layer 5: Immutable Audit Trails',
    desc: 'Every action, every decision, and every error is logged and stored in a tamper-proof audit trail. Get a complete, chronological history of what your bots have done, providing full transparency and traceability.',
    details: [
      'Detailed Event Logging: Records the action type, input data, outcome, and timestamp.',
      'Risk & Safety Context: Logs which safety rules were evaluated for each action.',
      'Exportable History: Download your full audit log for offline analysis or record-keeping.',
    ],
    color: 'var(--color-purple)',
  },
];

export default function SafetyPage() {
  return (
    <div className="landing">
      {/* ─── Navigation ─── */}
      <nav className="landing-nav">
        <Link href="/" className="landing-brand">BeastBots</Link>
        <div className="landing-nav-links">
          <Link href="/pricing" className="landing-nav-link">Pricing</Link>
          <Link href="/safety" className="landing-nav-link active">Safety</Link>
          <Link href="/login" className="landing-nav-link">Log in</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="hero">
        <div className="hero-glow green" />
        <div className="hero-glow blue" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <motion.div variants={fade} className="hero-badge">
            <Shield size={12} style={{ marginRight: 6 }}/>
            The foundation for performance
          </motion.div>

          <motion.h1 variants={fade} className="hero-title">
            Pursue ROI
            <span className="hero-title-gradient"> with Confidence</span>
          </motion.h1>

          <motion.p variants={fade} className="hero-desc">
            You can't optimize for return without first protecting your capital. Our 5-Layer Safety Model
            is designed to secure your assets so you can focus on performance.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Layers Section ─── */}
      <section className="safety-layers-section">
        <motion.div
            className="safety-layers-grid"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
        >
          {SAFETY_LAYERS.map((layer, index) => (
            <motion.div key={index} variants={fade} className="safety-layer-card">
              <div className="safety-layer-icon" style={{ background: `${layer.color}20`, color: layer.color }}>
                {layer.icon}
              </div>
              <h3 className="safety-layer-title">{layer.title}</h3>
              <p className="safety-layer-desc">{layer.desc}</p>
              <ul className="safety-layer-details">
                {layer.details.map((detail, i) => (
                  <li key={i}><CheckCircle2 size={12} style={{ color: 'var(--color-green)', marginRight: 8, flexShrink: 0 }} />{detail}</li>
                ))}
              </ul>
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
          <h2 className="cta-title">Ready to automate with confidence?</h2>
          <p className="cta-desc">
            Experience the peace of mind that comes with our industry-leading safety features.
          </p>
          <Link href="/signup" className="hero-btn-primary">
            <Sparkles size={16} />
            Get started for free
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
