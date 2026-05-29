import type { ParsedMessage, ParsedReasoning } from '../lib/types';
import { formatDate } from '../lib/format';
import { MarkdownContent } from './MarkdownContent';

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
      <MarkdownContent className="mt-2" text={message.text} />
    </details>
  );
}

export function ReasoningBubble({ item }: { item: ParsedReasoning }) {
  return (
    <details className="rounded border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
        Reasoning event · {formatDate(item.timestamp)}
      </summary>
      <MarkdownContent
        className="mt-2 text-slate-600 dark:text-slate-300"
        text={item.summaryText || (item.hasEncryptedContent ? '存在加密 reasoning 内容。' : '没有可读摘要。')}
      />
    </details>
  );
}
