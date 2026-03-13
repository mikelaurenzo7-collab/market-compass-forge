import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — BeastBots',
  description: 'BeastBots Privacy Policy. How we collect, use, protect, and never sell your data across our autonomous bot platform.',
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
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

      <article className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-effective">Effective Date: March 12, 2026</p>

        <p>
          BeastBots (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy.
          This Privacy Policy explains what information we collect, how we use it, and what rights you have regarding
          your data when you use the BeastBots platform and services.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Account Information</h3>
        <ul>
          <li><strong>Email address</strong> — used for authentication, communications, and account recovery.</li>
          <li><strong>Display name</strong> — used to personalize your experience.</li>
          <li><strong>Password</strong> — hashed with bcrypt (cost factor 12). We never store plaintext passwords.</li>
        </ul>

        <h3>1.2 Third-Party API Credentials</h3>
        <ul>
          <li>API keys and secrets you provide for exchanges (Coinbase, Binance, Alpaca), storefronts (Shopify, Amazon),
              social platforms (X, Instagram), and workforce tools (Slack, Notion).</li>
          <li>These credentials are <strong>encrypted at rest using AES-256-GCM</strong> with a server-side encryption key.</li>
          <li>Credentials are only decrypted in-memory when actively executing bot operations.</li>
          <li>OAuth tokens are stored with the same encryption standard.</li>
        </ul>

        <h3>1.3 Bot Configuration &amp; Activity Data</h3>
        <ul>
          <li>Bot names, strategies, platform selections, and configuration parameters.</li>
          <li>Execution logs: trade decisions, pricing adjustments, social posts, workflow actions.</li>
          <li>Performance metrics: P&amp;L, success rates, action counts, error logs.</li>
          <li>Safety events: circuit breaker trips, approval requests, audit trail entries.</li>
        </ul>

        <h3>1.4 Usage Data</h3>
        <ul>
          <li>Pages visited, features used, session duration, and interaction patterns.</li>
          <li>Device type, browser, and operating system (no fingerprinting).</li>
          <li>IP address — used for rate limiting and security monitoring only.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><strong>Service delivery</strong> — Authenticate you, execute your bots, display analytics.</li>
          <li><strong>Safety &amp; security</strong> — Detect unauthorized access, enforce rate limits, log audit trails.</li>
          <li><strong>Communications</strong> — Send account notifications, bot alerts, performance digests, and critical security notices.</li>
          <li><strong>Improvement</strong> — Analyze aggregate, anonymized usage patterns to improve the platform. We never use your individual trading strategies or bot configs for this purpose.</li>
        </ul>

        <h2>3. What We Never Do</h2>
        <div className="legal-callout">
          <ul style={{ margin: 0 }}>
            <li>We <strong>never sell</strong> your personal data.</li>
            <li>We <strong>never share</strong> your bot configurations, trading strategies, or API keys with other users or third parties.</li>
            <li>We <strong>never use</strong> your individual data for advertising or profiling.</li>
            <li>We <strong>never access</strong> your exchange balances, holdings, or order history beyond what your bot requires.</li>
            <li>We <strong>never train AI models</strong> on your individual data without explicit opt-in consent.</li>
          </ul>
        </div>

        <h2>4. Data Isolation</h2>
        <p>
          BeastBots uses a <strong>tenant isolation model</strong>. Each account&apos;s data — bots, credentials,
          decisions, metrics, and audit logs — is scoped to a unique tenant ID. There is no cross-tenant data access.
          Even our internal support tools enforce tenant boundaries.
        </p>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Account data</strong> — Retained while your account is active. Deleted within 30 days of account closure upon request.</li>
          <li><strong>Bot execution logs</strong> — Retained for 90 days by default. You may request earlier deletion.</li>
          <li><strong>Audit trail</strong> — Retained for 1 year for security and compliance purposes.</li>
          <li><strong>API credentials</strong> — Deleted immediately upon disconnection or account closure.</li>
        </ul>

        <h2>6. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>AES-256-GCM encryption for all stored API credentials.</li>
          <li>Bcrypt password hashing with high cost factor.</li>
          <li>JWT access tokens with 15-minute expiration and secure refresh token rotation.</li>
          <li>HttpOnly, Secure, SameSite=Strict cookies for session management.</li>
          <li>Rate limiting on all endpoints (global and per-route).</li>
          <li>Content Security Policy, HSTS, and security headers on all responses.</li>
          <li>Foreign key enforcement and parameterized queries to prevent SQL injection.</li>
        </ul>

        <h2>7. Third-Party Services</h2>
        <p>
          We connect to third-party platforms (exchanges, storefronts, social networks) solely to execute your bot
          operations using your own credentials. We do not share your data with these platforms beyond what is
          necessary for API calls you have authorized through your bot configuration.
        </p>
        <p>
          We may use privacy-respecting analytics (no personal data tracking) to understand aggregate usage patterns.
        </p>

        <h2>8. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li><strong>Access</strong> — Request a copy of all personal data we hold about you.</li>
          <li><strong>Correction</strong> — Update inaccurate personal information.</li>
          <li><strong>Deletion</strong> — Request deletion of your account and all associated data.</li>
          <li><strong>Export</strong> — Download your bot configurations, analytics, and activity logs in a portable format.</li>
          <li><strong>Restriction</strong> — Request that we stop processing certain data while a dispute is resolved.</li>
          <li><strong>Objection</strong> — Object to processing based on legitimate interest.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at <strong>privacy@beastbots.com</strong>.
          We will respond within 30 days.
        </p>

        <h2>9. International Data Transfers</h2>
        <p>
          BeastBots operates on Cloudflare&apos;s global edge network. Your data may be processed in data centers
          outside your country of residence. We rely on Cloudflare&apos;s data processing agreements and standard
          contractual clauses for international transfers.
        </p>

        <h2>10. Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for anyone under 18 years of age. We do not knowingly collect data from minors.
          If we become aware that a minor has created an account, we will promptly delete it.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated via email
          or in-app notification at least 30 days before taking effect. The &quot;Effective Date&quot; at the top of this page
          indicates the most recent revision.
        </p>

        <h2>12. Contact</h2>
        <p>
          Privacy questions or data requests? Contact our privacy team at <strong>privacy@beastbots.com</strong>.
        </p>
      </article>

      <footer className="landing-footer">
        <div className="legal-footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} BeastBots. All rights reserved.</p>
      </footer>
    </div>
  );
}
