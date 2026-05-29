import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SessionDetail } from '../lib/types';
import { formatCompactNumber, formatNumber, formatRateLimitLabel, formatUsd, sumTokens } from '../lib/format';

export function TokenChart({ session }: { session: SessionDetail }) {
  const data = session.tokenPoints.map((point, index) => ({
    index,
    input: point.total.input_tokens ?? 0,
    cached: point.total.cached_input_tokens ?? 0,
    output: point.total.output_tokens ?? 0,
    reasoning: point.total.reasoning_output_tokens ?? 0,
    total: sumTokens(point.total),
    last: sumTokens(point.last),
    context: point.contextWindow ? Math.round((sumTokens(point.total) / point.contextWindow) * 10000) / 100 : 0
  }));
  const last = session.tokenPoints.at(-1)?.total ?? {};

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Input', last.input_tokens],
          ['Cached', last.cached_input_tokens],
          ['Output', last.output_tokens],
          ['Reasoning', last.reasoning_output_tokens],
          ['总计', sumTokens(last)],
          ['上下文剩余', session.remainingTokens],
          ['费用', session.estimatedCostUsd]
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-semibold" title={value == null ? '' : formatNumber(Number(value))}>
              {label === '费用' ? formatUsd(value as number | null) : label === '上下文剩余' ? formatCompactNumber(value as number | null) : formatNumber(Number(value || 0))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="font-semibold">额度限制：</span> {formatRateLimitLabel(session.rateLimits)}
      </div>
      <Chart title="累计 Tokens">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="input" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="cached" stroke="#64748b" dot={false} />
          <Line type="monotone" dataKey="output" stroke="#16a34a" dot={false} />
          <Line type="monotone" dataKey="reasoning" stroke="#dc2626" dot={false} />
        </LineChart>
      </Chart>
      <Chart title="增量 Tokens">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="last" fill="#2563eb" />
        </BarChart>
      </Chart>
      <Chart title="上下文窗口占用">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" />
          <YAxis unit="%" />
          <Tooltip />
          <Line type="monotone" dataKey="context" stroke="#7c3aed" dot={false} />
        </LineChart>
      </Chart>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
