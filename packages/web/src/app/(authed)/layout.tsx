'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, ShoppingCart, Share2, Bot, Bell, User, Settings, LogOut } from 'lucide-react';

const fade = { hidden: { opacity: 0 }, show: { opacity: 1 } };

const NAV_ITEMS = [
    { href: '/dashboard', icon: <BarChart3 size={18} />, label: 'Dashboard' },
    { href: '/trading', icon: <TrendingUp size={18} />, label: 'Trading' },
    { href: '/ecommerce', icon: <ShoppingCart size={18} />, label: 'E-commerce' },
    { href: '/social', icon: <Share2 size={18} />, label: 'Social' },
];

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <motion.div initial="hidden" animate="show" variants={fade} className="authed-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Bot size={28} />
                    <span className="brand-name">BeastBots</span>
                </div>
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <Link key={item.href} href={item.href} className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-menu">
                        <User size={16}/>
                        <span>Mikelaurenzo</span>
                    </div>
                    <Link href="/settings" className="sidebar-icon-link"><Settings size={18} /></Link>
                    <Link href="/logout" className="sidebar-icon-link"><LogOut size={18} /></Link>
                </div>
            </aside>
            <main className="main-content">
                <header className="main-header">
                    <h1>{NAV_ITEMS.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}</h1>
                    <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                        <Link href="/notifications" className="header-icon-link"><Bell size={20} /></Link>
                        <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 20px'}}>
                           New Bot
                        </Link>
                    </div>
                </header>
                <div className="content-body">
                    {children}
                </div>
            </main>
        </motion.div>
    );
}
