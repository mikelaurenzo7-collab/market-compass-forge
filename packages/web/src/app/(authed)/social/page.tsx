'use client';

import { motion } from 'framer-motion';
import { Plus, Share2, CheckCircle, PauseCircle, AlertCircle } from 'lucide-react';

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const SOCIAL_BOTS = [
    {
        name: 'Evergreen Content - 𝕏',
        status: 'Active',
        engagement: 0.042,
        followers: 1240,
        strategy: 'Evergreen Content Scheduler',
        platform: '𝕏'
    },
    {
        name: 'Lead Capture - LinkedIn',
        status: 'Active',
        engagement: 0.081,
        followers: 345,
        strategy: 'Lead Capture Bot',
        platform: 'LinkedIn'
    },
    {
        name: 'Trend Engagement - TikTok',
        status: 'Paused',
        engagement: 0,
        followers: 0,
        strategy: 'Trend Engagement Bot',
        platform: 'TikTok'
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

export default function SocialPage() {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="dashboard-page">
        <motion.div variants={fade} className="bot-list">
            {SOCIAL_BOTS.map(bot => (
                <div key={bot.name} className="bot-card">
                    <div className="bot-card-header">
                        <Share2 size={16} />
                        <span className="bot-name">{bot.name}</span>
                    </div>
                    <div className="bot-card-body">
                        <div className="bot-metric">
                            <span className="metric-label">Engagement Rate</span>
                            <span className="metric-value">{(bot.engagement * 100).toFixed(1)}%</span>
                        </div>
                        <div className="bot-metric">
                            <span className="metric-label">Followers Gained</span>
                            <span className="metric-value">{bot.followers}</span>
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
                <span>New Social Bot</span>
            </motion.div>
        </motion.div>
    </motion.div>
  );
}
