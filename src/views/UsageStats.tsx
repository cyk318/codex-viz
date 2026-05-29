import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import type { SessionSummary } from '../lib/types';
import { formatCompactNumber, formatNumber, formatUsd } from '../lib/format';
import { lastThirtyDaysUsage, summarizeSessions, todayUsage } from '../lib/usage';

export function UsageStats() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.sessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const daily = useMemo(() => lastThirtyDaysUsage(sessions), [sessions]);
  const total = useMemo(() => summarizeSessions(sessions.filter((session) => daily.some((day) => day.date === localDateKey(new Date(session.startedAt))))), [daily, sessions]);
  const today = useMemo(() => todayUsage(sessions), [sessions]);
  const maxDay = useMemo(() => daily.reduce((best, day) => (day.tokens > best.tokens ? day : best), daily[0] ?? { tokens: 0, cost: 0, sessions: 0, date: '', label: '-' }), [daily]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/" className="text-sm text-blue-700 dark:text-blue-300">返回 sessions</Link>
          <h1 className="mt-2 text-2xl font-semibold">使用统计</h1>
          <p className="text-sm text-slate-500">按本地 session 开始日期聚合最近 30 天数据。</p>
        </div>
      </div>

      {error ? <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}
      {loading ? <div className="rounded border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">正在加载使用统计...</div> : null}

      {!loading ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="今日 Tokens" value={formatCompactNumber(today.tokens)} sub={`${today.sessions} 个 sessions`} />
            <Metric label="今日费用" value={formatUsd(today.cost)} sub="预估 USD" />
            <Metric label="30 天 Tokens" value={formatCompactNumber(total.tokens)} sub={`${formatNumber(total.sessions)} 个 sessions`} />
            <Metric label="峰值日期" value={formatCompactNumber(maxDay.tokens)} sub={maxDay.label} />
          </div>

          <Chart title="每日 Tokens">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={16} />
              <YAxis tickFormatter={(value) => formatCompactNumber(Number(value))} />
              <Tooltip formatter={(value) => formatNumber(Number(value))} />
              <Bar dataKey="tokens" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </Chart>

          <Chart title="每日预估费用">
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={16} />
              <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
              <Tooltip formatter={(value) => formatUsd(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </Chart>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 text-sm font-semibold">{title}</div>
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
