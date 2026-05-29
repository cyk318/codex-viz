import { Link } from 'react-router-dom';
import type { SessionSummary } from '../lib/types';
import { formatCompactNumber, formatUsd } from '../lib/format';
import { todayUsage } from '../lib/usage';

export function UsageBanner({ sessions }: { sessions: SessionSummary[] }) {
  const usage = todayUsage(sessions);

  return (
    <Link
      to="/stats"
      className="mb-4 block overflow-hidden rounded border border-blue-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-blue-900 dark:bg-slate-900 dark:hover:border-blue-700"
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">今日</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-300">Codex 使用概览</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            今日已记录 {usage.sessions} 个 sessions。点击查看最近 30 天统计。
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
          <div className="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500">Tokens</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950 dark:text-slate-300">{formatCompactNumber(usage.tokens)}</div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500">预估费用</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950 dark:text-slate-300">{formatUsd(usage.cost)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
