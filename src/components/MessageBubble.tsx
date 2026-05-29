import type { ParsedMessage, ParsedReasoning } from '../lib/types';
import { formatDate } from '../lib/format';

export function MessageBubble({ message }: { message: ParsedMessage }) {
  return (
    <details className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900" open={!message.collapsedByDefault}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">{message.role}</span>
          {message.phase ? <span>{message.phase}</span> : null}
          <span>{formatDate(message.timestamp)}</span>
          <span>turn {message.turnId?.slice(0, 8) || '-'}</span>
        </div>
      </summary>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
    </details>
  );
}

export function ReasoningBubble({ item }: { item: ParsedReasoning }) {
  return (
    <details className="rounded border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
        Reasoning event · {formatDate(item.timestamp)}
      </summary>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {item.summaryText || (item.hasEncryptedContent ? 'Encrypted reasoning content is present.' : 'No readable summary.')}
      </div>
    </details>
  );
}
