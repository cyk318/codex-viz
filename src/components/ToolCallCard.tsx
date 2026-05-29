import type { ParsedToolCall } from '../lib/types';
import { excerpt, formatDate, formatDuration } from '../lib/format';
import { CodeBlock } from './CodeBlock';

export function ToolCallCard({ call, compact = false }: { call: ParsedToolCall; compact?: boolean }) {
  const tone = call.status === 'error'
    ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
  return (
    <details className={`rounded border p-3 ${tone}`} open={!compact && call.status === 'error'}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{call.name}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{call.status}</span>
          <span className="text-slate-500">{formatDate(call.timestamp)}</span>
          <span className="text-slate-500">{formatDuration(call.durationMs)}</span>
          <span className="min-w-0 flex-1 truncate text-slate-500">{excerpt(call.rawArguments, 120)}</span>
        </div>
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">Arguments</div>
          <CodeBlock value={call.arguments || call.rawArguments} />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">Output</div>
          <CodeBlock value={call.output || ''} />
        </div>
      </div>
      {call.patchChanges ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-slate-500">Patch changes</div>
          <CodeBlock value={call.patchChanges} />
        </div>
      ) : null}
    </details>
  );
}
