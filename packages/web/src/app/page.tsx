import { INTEGRATIONS } from '@beastbots/shared';

export default function HomePage() {
  const trading = INTEGRATIONS.filter((i) => i.category === 'trading');
  const ecommerce = INTEGRATIONS.filter((i) => i.category === 'ecommerce');
  const social = INTEGRATIONS.filter((i) => i.category === 'social');

  return (
    <main className="shell">
      <h1>BeastBots</h1>
      <p className="subhead">Autonomous command center for trading, stores, social, and workforce operators.</p>
      <section>
        <h2>Trading Operators</h2>
        <ul>{trading.map((i) => <li key={i.id}>{i.displayName}</li>)}</ul>
      </section>
      <section>
        <h2>Store Operators</h2>
        <ul>{ecommerce.map((i) => <li key={i.id}>{i.displayName}</li>)}</ul>
      </section>
      <section>
        <h2>Social Operators</h2>
        <ul>{social.map((i) => <li key={i.id}>{i.displayName}</li>)}</ul>
      </section>
    </main>
  );
}
