import { useState } from 'react';

export default function BacktestPage() {
  const [botId, setBotId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [data, setData] = useState('');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const handleRunBacktest = async () => {
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId,
          symbol,
          data: JSON.parse(data),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run backtest');
      }

      const summary = await response.json();
      setSummary(summary);
      setError(null);
    } catch (error) {
      setError(error.message);
      setSummary(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Backtest</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Configuration</h2>

          <div className="mb-4">
            <label htmlFor="botId" className="block font-bold mb-2">
              Bot ID
            </label>
            <input
              type="text"
              id="botId"
              value={botId}
              onChange={(e) => setBotId(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="symbol" className="block font-bold mb-2">
              Symbol
            </label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="data" className="block font-bold mb-2">
              Data (JSON)
            </label>
            <textarea
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
              rows={10}
            />
          </div>

          <button
            onClick={handleRunBacktest}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
          >
            Run Backtest
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Summary</h2>

          {error && <div className="text-red-500">{error}</div>}

          {summary && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold">Orders</h3>
                <ul>
                  {summary.orders.map((order, index) => (
                    <li key={index}>
                      {order.side} {order.quantity} @ {order.price}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold">PNL</h3>
                <div>{summary.pnl}</div>
              </div>

              <div>
                <h3 className="text-lg font-bold">Sharpe Ratio</h3>
                <div>{summary.sharpeRatio}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
