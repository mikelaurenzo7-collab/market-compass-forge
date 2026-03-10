import { INTEGRATIONS, DEFAULT_PRICING } from '@beastbots/shared';
import type { IntegrationStatus, BotFamily } from '@beastbots/shared';

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  ga: 'Live',
  beta: 'Beta',
  planned: 'Coming Soon',
};

const FAMILY_LABELS: Record<BotFamily, string> = {
  trading: 'Trading',
  store: 'Store',
  social: 'Social',
  workforce: 'Workforce',
};

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function HomePage() {
  const trading = INTEGRATIONS.filter((i) => i.category === 'trading');
  const ecommerce = INTEGRATIONS.filter((i) => i.category === 'ecommerce');
  const social = INTEGRATIONS.filter((i) => i.category === 'social');

  const families: BotFamily[] = ['trading', 'store', 'social', 'workforce'];

  return (
    <main className="shell">
      <header className="hero">
        <h1>BeastBots</h1>
        <p className="subhead">
          Autonomous command center for trading, stores, social, and workforce operators.
        </p>
      </header>

      {/* Integrations */}
      <section className="section">
        <h2>Integrations</h2>

        <div className="integration-group">
          <h3>Trading</h3>
          <ul className="integration-list">
            {trading.map((i) => (
              <li key={i.id} className="integration-item">
                <span className="integration-name">{i.displayName}</span>
                <span className={`badge badge--${i.status}`}>{STATUS_LABEL[i.status]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="integration-group">
          <h3>Store Operators</h3>
          <ul className="integration-list">
            {ecommerce.map((i) => (
              <li key={i.id} className="integration-item">
                <span className="integration-name">{i.displayName}</span>
                <span className={`badge badge--${i.status}`}>{STATUS_LABEL[i.status]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="integration-group">
          <h3>Social Operators</h3>
          <ul className="integration-list">
            {social.map((i) => (
              <li key={i.id} className="integration-item">
                <span className="integration-name">{i.displayName}</span>
                <span className={`badge badge--${i.status}`}>{STATUS_LABEL[i.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="section">
        <h2>Pricing</h2>
        <div className="pricing-grid">
          {families.map((family) => (
            <div key={family} className="pricing-family">
              <h3>{FAMILY_LABELS[family]} Operators</h3>
              <ul className="pricing-list">
                {DEFAULT_PRICING.filter((p) => p.family === family).map((p) => (
                  <li key={`${p.family}-${p.tier}`} className="pricing-item">
                    <span className="pricing-tier">{TIER_LABELS[p.tier] ?? p.tier}</span>
                    <span className="pricing-price">${p.monthlyUsd.toLocaleString()}/mo</span>
                    <span className="pricing-usage">
                      ${p.includedUsageUsd.toLocaleString()} usage included
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
