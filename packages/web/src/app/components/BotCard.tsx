'use client';

import Link from 'next/link';
import { Play, Pause, Square, Trash2, ChevronRight, Zap, Shield } from 'lucide-react';
import { PlatformLogo, PlatformBadge, StrategyPill, getPlatformBrand, getFamilyConfig } from './PlatformIdentity';

interface BotData {
  id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
  strategies?: string[];
  config?: Record<string, unknown>;
}

function StatusIndicator({ status }: { status: string }) {
  return (
    <div className={`bot-status-chip ${status}`}>
      <span className={`status-dot ${status}`} />
      <span>{status}</span>
    </div>
  );
}

function LivePulseBar({ family, status }: { family: string; status: string }) {
  if (status !== 'running') return null;
  return (
    <div className={`live-pulse-bar ${family}`}>
      <div className="live-pulse-bar-fill" />
    </div>
  );
}

/* ─── Compact card for dashboard listing ─── */
export function DashboardBotCard({ bot }: { bot: BotData }) {
  const brand = getPlatformBrand(bot.platform);
  const familyCfg = getFamilyConfig(bot.family);

  return (
    <Link href={`/bots/${bot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className={`rich-bot-card ${bot.family}`}>
        <LivePulseBar family={bot.family} status={bot.status} />
        <div className="rich-bot-card-inner">
          <div className="rich-bot-card-header">
            <PlatformLogo platform={bot.platform} size={36} />
            <div className="rich-bot-card-info">
              <div className="rich-bot-card-name">{bot.name}</div>
              <div className="rich-bot-card-platform" style={{ color: brand.color }}>
                {brand.name}
                <span className="rich-bot-card-tagline"> · {brand.tagline}</span>
              </div>
            </div>
            <StatusIndicator status={bot.status} />
          </div>

          {/* Strategy pills */}
          {(() => {
            const strategies = bot.config?.strategies
              ? (bot.config.strategies as string[])
              : bot.config?.strategy
                ? [bot.config.strategy as string]
                : bot.strategies ?? [];
            return strategies.length > 0 ? (
              <div className="rich-bot-card-strategies">
                {strategies.slice(0, 3).map((s) => (
                  <StrategyPill key={s} strategy={s} />
                ))}
                {strategies.length > 3 && (
                  <span className="strategy-pill more">+{strategies.length - 3}</span>
                )}
              </div>
            ) : null;
          })()}

          {/* Bot type indicator */}
          <div className="rich-bot-card-footer">
            <span className="rich-bot-card-family" style={{ color: familyCfg.cssVar }}>
              {familyCfg.icon}
              <span>{familyCfg.label}</span>
            </span>
            {bot.status === 'running' && (
              <span className="rich-bot-card-live">
                <Zap size={10} /> Live
              </span>
            )}
            {Boolean(bot.config?.paperTrading) && (
              <span className="rich-bot-card-paper">
                <Shield size={10} /> Paper
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Full card for bots list page with action buttons ─── */
export function BotListCard({ bot, onAction, onDelete }: {
  bot: BotData;
  onAction: (id: string, action: string) => void;
  onDelete: (id: string) => void;
}) {
  const brand = getPlatformBrand(bot.platform);
  const familyCfg = getFamilyConfig(bot.family);

  const strategies = bot.config?.strategies
    ? (bot.config.strategies as string[])
    : bot.config?.strategy
      ? [bot.config.strategy as string]
      : bot.strategies ?? [];

  return (
    <div className={`rich-bot-card ${bot.family} interactive`}>
      <LivePulseBar family={bot.family} status={bot.status} />
      <div className="rich-bot-card-inner">
        {/* Platform-branded header */}
        <div className="rich-bot-card-header">
          <PlatformLogo platform={bot.platform} size={40} />
          <div className="rich-bot-card-info">
            <Link href={`/bots/${bot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="rich-bot-card-name">{bot.name}</div>
            </Link>
            <div className="rich-bot-card-platform" style={{ color: brand.color }}>
              {brand.name}
              <span className="rich-bot-card-tagline"> · {brand.tagline}</span>
            </div>
          </div>
          <StatusIndicator status={bot.status} />
        </div>

        {/* Strategies */}
        {strategies.length > 0 && (
          <div className="rich-bot-card-strategies">
            {strategies.slice(0, 4).map((s) => (
              <StrategyPill key={s} strategy={s} />
            ))}
            {strategies.length > 4 && (
              <span className="strategy-pill more">+{strategies.length - 4}</span>
            )}
          </div>
        )}

        {/* Family + mode tags */}
        <div className="rich-bot-card-meta">
          <span className="rich-bot-card-family" style={{ color: familyCfg.cssVar }}>
            {familyCfg.icon}
            <span>{familyCfg.verb} on {brand.name}</span>
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {bot.status === 'running' && (
              <span className="rich-bot-card-live"><Zap size={10} /> Live</span>
            )}
            {Boolean(bot.config?.paperTrading || bot.config?.paperMode) && (
              <span className="rich-bot-card-paper"><Shield size={10} /> Paper</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="rich-bot-card-actions">
          {bot.status === 'running' ? (
            <>
              <button className="bot-action-btn secondary" onClick={() => onAction(bot.id, 'pause')}>
                <Pause size={12} /> Pause
              </button>
              <button className="bot-action-btn danger" onClick={() => onAction(bot.id, 'stop')}>
                <Square size={12} /> Stop
              </button>
            </>
          ) : bot.status === 'paused' ? (
            <>
              <button className="bot-action-btn primary" onClick={() => onAction(bot.id, 'start')}>
                <Play size={12} /> Resume
              </button>
              <button className="bot-action-btn danger" onClick={() => onAction(bot.id, 'stop')}>
                <Square size={12} /> Stop
              </button>
            </>
          ) : (
            <button className="bot-action-btn primary" onClick={() => onAction(bot.id, 'start')}>
              <Play size={12} /> Start
            </button>
          )}
          {bot.status !== 'running' && (
            <button className="bot-action-btn danger" onClick={() => onDelete(bot.id)}>
              <Trash2 size={12} /> Delete
            </button>
          )}
          <Link href={`/bots/${bot.id}`} className="bot-action-btn secondary details" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
            Details <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
