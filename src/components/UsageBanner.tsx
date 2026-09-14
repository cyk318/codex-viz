import { Link } from 'react-router-dom';
import type { SessionSummary } from '../lib/types';
import { formatCny, formatCompactNumber } from '../lib/format';
import { lastThirtyDaysUsage, todayUsage } from '../lib/usage';
import { OrbitVisual } from './OrbitVisual';
import { Icon } from './Icon';

export function UsageBanner({ sessions }: { sessions: SessionSummary[] }) {
  const usage = todayUsage(sessions);
  const daily = lastThirtyDaysUsage(sessions).slice(-14);
  const max = Math.max(1, ...daily.map((day) => day.tokens));
  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-cross">✳</span> YOUR IDEAS. IN ORBIT.
          </div>
          <h1>
            每一次对话，
            <br />
            都是新的<span>可能。</span>
          </h1>
          <p>
            回溯思考的轨迹，掌握构建的节奏。
            <br />
            你的 Codex 工作空间，尽在此处。
          </p>
          <Link to="/stats" className="hero-link">
            探索使用洞察 <Icon name="arrow" size={16} />
          </Link>
        </div>
        <OrbitVisual />
        <span className="hero-corner">↗</span>
      </section>
      <div className="metrics-grid">
        <Link to="/stats" className="metric-card">
          <div className="metric-top">
            <span>今日 TOKEN 用量</span>
            <Icon name="bolt" size={16} />
          </div>
          <div className="metric-value">
            {formatCompactNumber(usage.tokens)}
            <span>tokens</span>
          </div>
          <div className="metric-bottom">
            <span className="status-dot" /> 今日 {usage.sessions} 次任务探索
          </div>
          <div className="mini-bars" aria-label="近 14 天 token 用量">
            {daily.map((day) => (
              <i
                key={day.date}
                title={`${day.label} · ${formatCompactNumber(day.tokens)}`}
                style={{ height: `${Math.max(5, (day.tokens / max) * 100)}%` }}
              />
            ))}
          </div>
        </Link>
        <Link to="/stats" className="metric-card">
          <div className="metric-top">
            <span>今日预估费用</span>
            <span className="mono">CNY</span>
          </div>
          <div className="metric-value">{formatCny(usage.cost)}</div>
          <div className="metric-bottom">
            Standard API 等价估算 <Icon name="arrow" size={14} />
          </div>
        </Link>
        <div className="metric-card">
          <div className="metric-top">
            <span>已归档任务</span>
            <Icon name="grid" size={16} />
          </div>
          <div className="metric-value">
            {sessions.length}
            <span>sessions</span>
          </div>
          <div className="metric-bottom">
            <span className="project-dots">
              <i />
              <i />
              <i />
            </span>{' '}
            {new Set(sessions.map((s) => s.cwd)).size} 个项目的构建旅程
          </div>
        </div>
      </div>
    </>
  );
}
