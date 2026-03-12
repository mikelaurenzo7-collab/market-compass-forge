'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Share2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const OVERVIEW_STATS = [
    { label: "Total P&L (Trading)", value: "$1,245.67", trend: 2.5 },
    { label: "Total Revenue (E-commerce)", value: "$3,320.65", trend: 1.8 },
    { label: "New Followers (Social)", value: "1,585", trend: 12.1 },
    { label: "Active Bots", value: "5", trend: 0 },
];

const RECENT_ACTIVITY = [
    { type: 'trading', text: 'Momentum Surge bot executed a buy on SOL/USDC.', time: '2m ago' },
    { type: 'ecommerce', text: 'Abandoned Cart bot recovered a sale worth $79.99.', time: '15m ago' },
    { type: 'social', text: 'Evergreen Content bot re-shared a top post on 𝕏.', time: '1h ago' },
    { type: 'trading', text: 'DCA bot bought $50 of BTC.', time: '3h ago' },
];

const FamilyIcon = ({ type }: { type: string }) => {
    const iconMap = {
        trading: <TrendingUp size={16}/>,
        ecommerce: <ShoppingCart size={16}/>,
        social: <Share2 size={16}/>,
    };
    return <div className={`activity-icon ${type}`}>{iconMap[type as keyof typeof iconMap]}</div>
}

export default function DashboardPage() {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="dashboard-page overview-dashboard">
        
        <motion.div variants={fade} className="overview-grid">
            {OVERVIEW_STATS.map(stat => (
                <div key={stat.label} className="overview-stat-card">
                    <span className="stat-label">{stat.label}</span>
                    <span className="stat-value">{stat.value}</span>
                    {stat.trend !== 0 && 
                        <span className={`stat-trend ${stat.trend > 0 ? 'positive' : 'negative'}`}>
                            {stat.trend > 0 ? '▲' : '▼'} {Math.abs(stat.trend)}%
                        </span>
                    }
                </div>
            ))}
        </motion.div>

        <div className="dashboard-columns">
            <motion.div variants={fade} className="dashboard-column">
                <h3 className="column-title">Recent Activity</h3>
                <div className="activity-feed">
                    {RECENT_ACTIVITY.map((item, i) => (
                        <div key={i} className="activity-item">
                            <FamilyIcon type={item.type} />
                            <div className="activity-text">{item.text}</div>
                            <div className="activity-time">{item.time}</div>
                        </div>
                    ))}
                </div>
            </motion.div>
            <motion.div variants={fade} className="dashboard-column">
                 <h3 className="column-title">Quick Links</h3>
                 <div className="quick-links">
                    <Link href="/trading" className="quick-link">
                        Go to Trading Dashboard <ArrowRight size={16} />
                    </Link>
                     <Link href="/ecommerce" className="quick-link">
                        Go to E-commerce Dashboard <ArrowRight size={16} />
                    </Link>
                     <Link href="/social" className="quick-link">
                        Go to Social Dashboard <ArrowRight size={16} />
                    </Link>
                     <Link href="/safety" className="quick-link">
                        Review Safety Settings <ArrowRight size={16} />
                    </Link>
                 </div>
            </motion.div>
        </div>

    </motion.div>
  );
}
