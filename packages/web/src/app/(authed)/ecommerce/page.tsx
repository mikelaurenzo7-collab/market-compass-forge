'use client';

import { motion } from 'framer-motion';
import { Plus, ShoppingCart, CheckCircle, PauseCircle, AlertCircle } from 'lucide-react';

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const ECOMMERCE_BOTS = [
    {
        name: 'Dynamic Pricing - Main Store',
        status: 'Active',
        revenueImpact: 2340.15,
        events: 128,
        strategy: 'Dynamic Pricing',
        platform: 'Shopify'
    },
    {
        name: 'Abandoned Cart - Etsy',
        status: 'Active',
        revenueImpact: 980.50,
        events: 45,
        strategy: 'Abandoned Cart Recovery',
        platform: 'Etsy'
    },
    {
        name: 'Inventory Alert - Amazon FBA',
        status: 'Paused',
        revenueImpact: 0,
        events: 12,
        strategy: 'Inventory Restock Alert',
        platform: 'Amazon'
    },
];

const StatusPill = ({ status }: { status: string }) => {
    const statusMap: { [key: string]: { icon: React.ReactNode, color: string, label: string } } = {
        'Active': { icon: <CheckCircle size={12} />, color: 'var(--color-green)', label: 'Active' },
        'Paused': { icon: <PauseCircle size={12} />, color: 'var(--color-orange)', label: 'Paused' },
        'Error': { icon: <AlertCircle size={12} />, color: 'var(--color-red)', label: 'Error' },
    };
    const { icon, color, label } = statusMap[status] || statusMap['Error'];

    return <div className="status-pill" style={{ color, borderColor: color, background: `${color}15` }}>{icon} {label}</div>;
};

export default function EcommercePage() {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="dashboard-page">
        <motion.div variants={fade} className="bot-list">
            {ECOMMERCE_BOTS.map(bot => (
                <div key={bot.name} className="bot-card">
                    <div className="bot-card-header">
                        <ShoppingCart size={16} />
                        <span className="bot-name">{bot.name}</span>
                    </div>
                    <div className="bot-card-body">
                        <div className="bot-metric">
                            <span className="metric-label">Revenue Impact</span>
                            <span className={`metric-value ${bot.revenueImpact > 0 ? 'positive' : ''}`}>
                                {bot.revenueImpact.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                        </div>
                        <div className="bot-metric">
                            <span className="metric-label">Events</span>
                            <span className="metric-value">{bot.events}</span>
                        </div>
                         <div className="bot-metric">
                            <span className="metric-label">Status</span>
                            <StatusPill status={bot.status} />
                        </div>
                    </div>
                    <div className="bot-card-footer">
                         <span className="bot-info-tag">{bot.strategy}</span>
                         <span className="bot-info-tag">{bot.platform}</span>
                    </div>
                </div>
            ))}
             <motion.div variants={fade} className="bot-card new-bot-card">
                <Plus size={24} />
                <span>New E-commerce Bot</span>
            </motion.div>
        </motion.div>
    </motion.div>
  );
}
