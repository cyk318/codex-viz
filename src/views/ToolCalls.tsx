import { useMemo, useState } from 'react';
import type { ParsedToolCall } from '../lib/types';
import { ToolCallCard } from '../components/ToolCallCard';

export function ToolCalls({ calls }: { calls: ParsedToolCall[] }) {
  const [tool, setTool] = useState('all');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const tools = useMemo(() => ['all', ...Array.from(new Set(calls.map((call) => call.name))).sort()], [calls]);
  const filtered = calls.filter((call) => (tool === 'all' || call.name === tool) && (!errorsOnly || call.status === 'error'));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <select className="h-8 rounded border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={tool} onChange={(event) => setTool(event.target.value)}>
          {tools.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={errorsOnly} onChange={(event) => setErrorsOnly(event.target.checked)} />
          仅错误
        </label>
        <span className="text-sm text-slate-500">{filtered.length} 次调用</span>
      </div>
      {filtered.map((call) => <ToolCallCard key={call.callId} call={call} />)}
      {!filtered.length ? <div className="rounded border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">没有工具调用。</div> : null}
    </div>
  );
}
