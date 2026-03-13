import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Risk Disclaimer — BeastBots',
  description: 'BeastBots risk disclaimer. Important information about the risks of automated trading, ecommerce automation, and AI-powered bots.',
};

export default function DisclaimerPage() {
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
        <h1>Risk Disclaimer</h1>
        <p className="legal-effective">Effective Date: March 12, 2026</p>

        <div className="legal-callout" style={{ marginBottom: '2rem' }}>
          <strong>Please read this disclaimer carefully before using BeastBots.</strong> By using the Service, you
          acknowledge that you have read, understood, and agree to the risks described below.
        </div>

        <h2>General Risk Statement</h2>
        <p>
          BeastBots is an autonomous bot platform that executes user-configured strategies on third-party platforms.
          While we provide robust safety controls including budget caps, circuit breakers, human-in-the-loop approvals,
          kill switches, and immutable audit trails, <strong>no automated system can eliminate all risk.</strong>
        </p>

        <h2>Trading &amp; Financial Risks</h2>
        <div className="legal-callout">
          <strong>
            Trading in cryptocurrency, equities, options, prediction markets, and other financial instruments involves
            substantial risk of loss. You could lose some or all of your invested capital.
          </strong>
        </div>
        <ul>
          <li><strong>Market risk</strong> — Asset prices can move rapidly and unpredictably. Flash crashes, black swan
              events, and extreme volatility can cause significant losses even with stop-loss protections.</li>
          <li><strong>Execution risk</strong> — Orders may not be filled at expected prices due to slippage, low
              liquidity, or exchange outages. API rate limits may delay or prevent order execution.</li>
          <li><strong>Strategy risk</strong> — No trading strategy is guaranteed to be profitable. Backtesting results
              do not guarantee future performance. Overfitting to historical data is a common risk.</li>
          <li><strong>Technology risk</strong> — Software bugs, network failures, cloud infrastructure outages, or
              exchange API changes may cause unexpected bot behavior or missed trades.</li>
          <li><strong>Regulatory risk</strong> — Cryptocurrency and financial regulations vary by jurisdiction and
              change frequently. You are responsible for ensuring your trading activities comply with applicable laws.</li>
        </ul>
        <p>
          <strong>BeastBots does not provide financial advice, investment recommendations, or portfolio management.</strong>{' '}
          We provide automated tools. You configure the strategies. You bear the responsibility for outcomes.
        </p>
        <p>
          <strong>Recommendation:</strong> Always start in Paper Mode. Test your strategies with simulated execution
          before deploying with real capital. Use conservative position sizes and stop-loss settings.
        </p>

        <h2>Ecommerce &amp; Store Risks</h2>
        <ul>
          <li><strong>Pricing errors</strong> — Automated pricing adjustments may result in products being listed at
              unintended prices. Use the <code>maxPriceChangePercent</code> and <code>minMarginPercent</code> safety
              settings to limit exposure.</li>
          <li><strong>Inventory misjudgment</strong> — Forecasting algorithms may over- or under-estimate demand,
              leading to stockouts or excess inventory.</li>
          <li><strong>Platform compliance</strong> — Automated listing changes may violate marketplace policies
              (Amazon, eBay, Etsy) and result in listing removals or account suspensions.</li>
          <li><strong>Customer experience</strong> — Automated review responses may not adequately address customer
              concerns. Enable content approval for sensitive interactions.</li>
        </ul>

        <h2>Social Media Risks</h2>
        <ul>
          <li><strong>Account restrictions</strong> — Social platforms may restrict or suspend accounts that exceed
              their automation limits. BeastBots provides configurable rate limits, but platform-side enforcement
              is outside our control.</li>
          <li><strong>Content liability</strong> — You are responsible for all content published by your social bots.
              Enable <code>contentApprovalRequired</code> for sensitive topics. Use the{' '}
              <code>sensitiveTopicKeywords</code> filter to prevent unwanted content.</li>
          <li><strong>Brand risk</strong> — Poorly timed or tonally inappropriate automated posts may harm your brand
              reputation. Use brand voice guidelines and content approval workflows.</li>
        </ul>

        <h2>Workforce Automation Risks</h2>
        <ul>
          <li><strong>Incorrect routing</strong> — Automated task triage and escalation may misroute critical items.
              Review escalation rules regularly.</li>
          <li><strong>Data sensitivity</strong> — Workforce bots may process sensitive employee or customer data.
              Ensure your bot configurations comply with your organization&apos;s data handling policies.</li>
        </ul>

        <h2>Our Safety Model</h2>
        <p>
          BeastBots implements a <strong>5-layer safety model</strong> designed to minimize risk:
        </p>
        <ol>
          <li><strong>Policy checks</strong> — Rule engine evaluates every action against configurable policies before execution.</li>
          <li><strong>Approval queue</strong> — High-risk actions require human approval before proceeding.</li>
          <li><strong>Budget caps</strong> — Configurable daily spend limits and per-action maximums prevent runaway losses.</li>
          <li><strong>Circuit breakers</strong> — Automatic bot shutdown after consecutive errors or error rate thresholds.</li>
          <li><strong>Kill switches</strong> — Instant emergency stop available for every bot at any time.</li>
        </ol>
        <p>
          All actions are logged in an <strong>immutable audit trail</strong> for transparency and review.
          Despite these safeguards, no system is infallible. Use these tools actively and review your bot performance regularly.
        </p>

        <h2>No Guarantees</h2>
        <div className="legal-callout">
          <p style={{ margin: 0 }}>
            BEASTBOTS MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE
            PROFITABILITY, RELIABILITY, OR ACCURACY OF ANY BOT, STRATEGY, INDICATOR, OR AUTOMATED ACTION.
            PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS.
          </p>
        </div>

        <h2>Your Responsibility</h2>
        <p>By using BeastBots, you acknowledge that:</p>
        <ul>
          <li>You have read and understood this Risk Disclaimer.</li>
          <li>You are making your own independent decision to use automated tools.</li>
          <li>You are financially able to bear losses from trading and automation activities.</li>
          <li>You will actively monitor your bots and use the safety controls provided.</li>
          <li>You will not hold BeastBots liable for losses arising from your use of the Service.</li>
        </ul>

        <h2>Questions?</h2>
        <p>
          If you have questions about the risks involved in using BeastBots, contact us at{' '}
          <strong>support@beastbots.com</strong> before deploying bots with real capital or live execution.
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
