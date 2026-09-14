import { useMotion } from '../hooks/useMotion';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import type { SessionSummary } from '../lib/types';
import { formatCny, formatCompactNumber, formatNumber } from '../lib/format';
import {
  lastThirtyDaysUsage,
  summarizeSessions,
  todayUsage
} from '../lib/usage';

export function UsageStats() {
  const motion = useMotion();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .sessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const daily = useMemo(() => lastThirtyDaysUsage(sessions), [sessions]);
  const total = useMemo(
    () =>
      summarizeSessions(
        sessions.filter((session) =>
          daily.some(
            (day) => day.date === localDateKey(new Date(session.startedAt))
          )
        )
      ),
    [daily, sessions]
  );
  const today = useMemo(() => todayUsage(sessions), [sessions]);
  const maxDay = useMemo(
    () =>
      daily.reduce(
        (best, day) => (day.tokens > best.tokens ? day : best),
        daily[0] ?? { tokens: 0, cost: 0, sessions: 0, date: '', label: '-' }
      ),
    [daily]
  );

  return (
    <main className="stats-page">
      <div className="stats-heading">
        <div>
          <div className="eyebrow">WORKSPACE ANALYTICS</div>
          <h1>让每一份投入，清晰可见。</h1>
          <p>
            回顾近 30 天的构建节奏，发现属于你的高效时刻。
            <br />
            按任务开始日期聚合 · Standard API 等价预估
          </p>
        </div>
        <span className="period-tag">
          <Icon name="clock" size={14} />
          最近 30 天
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          正在加载使用统计...
        </div>
      ) : null}

      {!loading ? (
        <div className="stats-grid">
          <div className="stats-metrics">
            <Metric
              label="今日 Tokens"
              value={formatCompactNumber(today.tokens)}
              sub={`${today.sessions} 个 sessions`}
            />
            <Metric
              label="今日费用"
              value={formatCny(today.cost)}
              sub="预估人民币"
            />
            <Metric
              label="30 天 Tokens"
              value={formatCompactNumber(total.tokens)}
              sub={`${formatNumber(total.sessions)} 个 sessions`}
            />
            <Metric
              label="峰值日期"
              value={formatCompactNumber(maxDay.tokens)}
              sub={maxDay.label}
            />
          </div>

          <div className="stats-charts">
            <Chart title="每日 Tokens">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" minTickGap={16} />
                <YAxis
                  tickFormatter={(value) => formatCompactNumber(Number(value))}
                />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Bar
                  isAnimationActive={motion}
                  dataKey="tokens"
                  fill="#be98ed"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </Chart>

            <Chart title="每日预估费用">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" minTickGap={16} />
                <YAxis
                  tickFormatter={(value) => `¥${Number(value).toFixed(0)}`}
                />
                <Tooltip formatter={(value) => formatCny(Number(value))} />
                <Legend />
                <Line
                  isAnimationActive={motion}
                  type="monotone"
                  dataKey="cost"
                  stroke="#d4b389"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </Chart>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Metric({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="stat-metric">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="chart-panel">
      <div className="chart-title">
        {title}
        <span>30 DAYS / OVERVIEW</span>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
