import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — BeastBots',
  description: 'BeastBots Terms of Service. Read our terms governing the use of autonomous trading, ecommerce, social, and workforce automation bots.',
};

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="legal-effective">Effective Date: March 12, 2026</p>

        <p>
          Welcome to BeastBots (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of Service
          (&quot;Terms&quot;) govern your access to and use of the BeastBots platform, including our website, APIs, SDK,
          bot creation and execution services, and related tools (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old and legally capable of entering into a binding agreement. By using the Service
          you represent that you meet these requirements. If you are using the Service on behalf of a business, you represent
          that you have authority to bind that entity.
        </p>

        <h2>2. Account Registration &amp; Security</h2>
        <p>
          You must provide accurate information when creating an account. You are responsible for maintaining the
          confidentiality of your credentials, including API keys you connect to the platform. You must notify us
          immediately at <strong>security@beastbots.com</strong> if you suspect unauthorized access.
        </p>
        <p>
          We encrypt all third-party API keys using AES-256-GCM encryption at rest. However, you are solely responsible
          for following best practices when generating API keys on third-party platforms, including:
        </p>
        <ul>
          <li>Enabling trade permissions only — <strong>never</strong> enable withdrawal permissions for keys used with BeastBots.</li>
          <li>Using IP allowlisting where supported by your exchange or platform.</li>
          <li>Regularly rotating API keys.</li>
        </ul>

        <h2>3. Description of Service</h2>
        <p>
          BeastBots provides autonomous bot operators across four families: Trading, Store (ecommerce), Social Media,
          and Workforce automation. Bots execute strategies on your behalf by connecting to third-party platforms via
          your API credentials or OAuth authorizations.
        </p>

        <h2>4. Financial &amp; Trading Disclaimer</h2>
        <div className="legal-callout">
          <strong>BeastBots does not provide financial, investment, or trading advice.</strong> The Service provides
          automated tools that execute user-configured strategies. All trading and financial decisions are made by you
          through your configuration choices. Past performance of any strategy, bot, or indicator does not guarantee
          future results. Trading in cryptocurrency, equities, prediction markets, and other financial instruments
          involves substantial risk of loss. You may lose some or all of your invested capital.
        </div>
        <p>
          You acknowledge and agree that:
        </p>
        <ul>
          <li>You are solely responsible for all trades, orders, and financial actions executed by your bots.</li>
          <li>We strongly recommend starting in <strong>Paper Mode</strong> to test strategies before committing real capital.</li>
          <li>BeastBots provides a 5-layer safety model (policy checks, approval queues, budget caps, circuit breakers,
              and audit trails), but no safety system eliminates all risk.</li>
          <li>Market conditions, API outages, exchange downtime, and network latency can cause unexpected outcomes.</li>
        </ul>

        <h2>5. Ecommerce &amp; Store Bot Disclaimer</h2>
        <p>
          Store bots may adjust pricing, inventory, and product listings on your connected storefronts. You are responsible
          for reviewing automated changes and ensuring compliance with platform policies (Shopify, Amazon, Etsy, etc.).
          BeastBots is not liable for pricing errors, listing removals, or account suspensions resulting from automated actions.
        </p>

        <h2>6. Social Media Bot Disclaimer</h2>
        <p>
          Social bots post, engage, and manage content on your connected social accounts. You are responsible for ensuring
          that automated actions comply with each platform&apos;s terms of service and community guidelines.
          Excessive automation may result in account restrictions imposed by the social platform — BeastBots is not
          liable for such actions. We provide configurable rate limits and content approval workflows to mitigate this risk.
        </p>

        <h2>7. Prohibited Uses</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Engage in market manipulation, wash trading, spoofing, or any illegal trading activity.</li>
          <li>Violate any applicable law, regulation, or third-party platform terms of service.</li>
          <li>Spam, harass, or engage in abusive automation on social media platforms.</li>
          <li>Attempt to reverse-engineer, decompile, or extract source code from the Service.</li>
          <li>Circumvent rate limits, safety controls, or circuit breakers.</li>
          <li>Use the Service to transmit malware, phishing content, or harmful code.</li>
          <li>Resell or sublicense access to the Service without written authorization.</li>
        </ul>

        <h2>8. Subscription &amp; Billing</h2>
        <p>
          The Service is offered on a subscription basis with tiered pricing per bot family. Pricing details are
          available at <Link href="/pricing">/pricing</Link>. Subscriptions renew automatically unless cancelled
          before the renewal date. Refunds are handled on a case-by-case basis within 14 days of initial purchase.
        </p>

        <h2>9. Data &amp; Privacy</h2>
        <p>
          Your use of the Service is also governed by our <Link href="/privacy">Privacy Policy</Link>. We do not
          sell your personal data. Bot configurations, trade history, and analytics data are isolated per tenant and
          never shared across accounts. See our Privacy Policy for full details.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          The Service, including its code, design, documentation, and branding, is owned by BeastBots. You retain
          ownership of your data, configurations, and outputs generated through the Service. You grant us a limited
          license to process your data solely to provide the Service.
        </p>

        <h2>11. Limitation of Liability</h2>
        <div className="legal-callout">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEASTBOTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, TRADING LOSSES,
          BUSINESS INTERRUPTION, OR LOSS OF REVENUE, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL AGGREGATE LIABILITY
          SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.
        </div>

        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless BeastBots, its officers, directors, and employees from any claims,
          damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation
          of any third-party rights.
        </p>

        <h2>13. Service Availability &amp; Modifications</h2>
        <p>
          We strive for 99.9% uptime but do not guarantee uninterrupted service. We may modify, suspend, or discontinue
          features with reasonable notice. Critical safety features (kill switches, circuit breakers) will be maintained
          as long as any bots are active on the platform.
        </p>

        <h2>14. Termination</h2>
        <p>
          You may close your account at any time. We may suspend or terminate accounts that violate these Terms.
          Upon termination, all active bots are immediately stopped. You may request export of your data within
          30 days of account closure.
        </p>

        <h2>15. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, United States. Any disputes will be resolved
          through binding arbitration under the rules of the American Arbitration Association, except for claims
          eligible for small claims court.
        </p>

        <h2>16. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be communicated via email or in-app
          notification at least 30 days before taking effect. Continued use of the Service after changes constitutes
          acceptance of the updated Terms.
        </p>

        <h2>17. Contact</h2>
        <p>
          Questions about these Terms? Contact us at <strong>legal@beastbots.com</strong>.
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
