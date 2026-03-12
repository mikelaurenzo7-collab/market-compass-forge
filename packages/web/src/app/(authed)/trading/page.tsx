'use client';

import { motion } from 'framer-motion';
import { Plus, TrendingUp, CheckCircle, PauseCircle, AlertCircle } from 'lucide-react';

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const TRADING_BOTS = [
    {
        name: 'Momentum Surge - SOL/USDC',
        status: 'Active',
        pnl: 1245.67,
        winRate: 0.62,
        strategy: 'Momentum Surge',
        exchange: 'Coinbase'
    },
    {
        name: 'DCA - BTC/USD',
        status: 'Paper Mode',
        pnl: 89.12,
        winRate: 0.71,
        strategy: 'Dollar-Cost Averaging',
        exchange: 'Binance'
    },
    {
        name: 'Mean Reversion - ETH/USD',
        status: 'Paused',
        pnl: -54.20,
        winRate: 0.45,
        strategy: 'Mean Reversion',
        exchange: 'Alpaca'
    },
    {
        name: 'Arbitrage Hunter - MULTI',
        status: 'Error',
        pnl: 0,
        winRate: 0,
        strategy: 'Arbitrage Hunter',
        exchange: 'Multi-Exchange'
    }
];

const StatusPill = ({ status }: { status: string }) => {
    const statusMap: { [key: string]: { icon: React.ReactNode, color: string, label: string } } = {
        'Active': { icon: <CheckCircle size={12} />, color: 'var(--color-green)', label: 'Active' },
        'Paper Mode': { icon: <CheckCircle size={12} />, color: 'var(--color-blue)', label: 'Paper Mode' },
        'Paused': { icon: <PauseCircle size={12} />, color: 'var(--color-orange)', label: 'Paused' },
        'Error': { icon: <AlertCircle size={12} />, color: 'var(--color-red)', label: 'Error' },
    };
    const { icon, color, label } = statusMap[status] || statusMap['Error'];

    return <div className="status-pill" style={{ color, borderColor: color, background: `${color}15` }}>{icon} {label}</div>;
};

export default function TradingPage() {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="dashboard-page">
        <motion.div variants={fade} className="bot-list">
            {TRADING_BOTS.map(bot => (
                <div key={bot.name} className="bot-card">
                    <div className="bot-card-header">
                        <TrendingUp size={16} />
                        <span className="bot-name">{bot.name}</span>
                    </div>
                    <div className="bot-card-body">
                        <div className="bot-metric">
                            <span className="metric-label">P&L</span>
                            <span className={`metric-value ${bot.pnl > 0 ? 'positive' : bot.pnl < 0 ? 'negative' : ''}`}>
                                {bot.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                        </div>
                        <div className="bot-metric">
                            <span className="metric-label">Win Rate</span>
                            <span className="metric-value">{(bot.winRate * 100).toFixed(0)}%</span>
                        </div>
                         <div className="bot-metric">
                            <span className="metric-label">Status</span>
                            <StatusPill status={bot.status} />
                        </div>
                    </div>
                    <div className="bot-card-footer">
                         <span className="bot-info-tag">{bot.strategy}</span>
                         <span className="bot-info-tag">{bot.exchange}</span>
                    </div>
                </div>
            ))}
             <motion.div variants={fade} className="bot-card new-bot-card">
                <Plus size={24} />
                <span>New Trading Bot</span>
            </motion.div>
        </motion.div>
    </motion.div>
  );
}
