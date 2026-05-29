import type { ParsedMessage, ParsedReasoning, SessionDetail } from '../lib/types';
import { formatDate } from '../lib/format';
import { MarkdownContent } from '../components/MarkdownContent';

type ConversationItem =
  | { type: 'message'; timestamp: string; entryIndex: number; item: ParsedMessage }
  | { type: 'reasoning'; timestamp: string; entryIndex: number; item: ParsedReasoning };

export function Conversation({ session }: { session: SessionDetail }) {
  const items: ConversationItem[] = [
    ...session.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((item) => ({ type: 'message' as const, timestamp: item.timestamp, entryIndex: item.entryIndex, item })),
    ...session.reasoning
      .filter((item) => item.summaryText.trim())
      .map((item) => ({ type: 'reasoning' as const, timestamp: item.timestamp, entryIndex: item.entryIndex, item }))
  ].sort((a, b) => a.entryIndex - b.entryIndex);

  return (
    <div className="mx-auto grid max-w-5xl gap-3">
      <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        仅展示 user / assistant 对话和可读 reasoning 摘要；工具调用、命令输出和 patch 已隐藏。
      </div>
      {items.map((entry) => (
        entry.type === 'message'
          ? <ConversationMessage key={`${entry.type}-${entry.entryIndex}`} message={entry.item} />
          : <ConversationReasoning key={`${entry.type}-${entry.entryIndex}`} item={entry.item} />
      ))}
      {!items.length ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          没有可展示的简要对话。
        </div>
      ) : null}
    </div>
  );
}

function ConversationMessage({ message }: { message: ParsedMessage }) {
  const isUser = message.role === 'user';
  return (
    <article className={`rounded border p-4 ${isUser ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className={`font-semibold uppercase ${isUser ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
          {isUser ? 'user' : 'assistant'}
        </span>
        {message.phase ? <span>{message.phase}</span> : null}
        <span>{formatDate(message.timestamp)}</span>
      </div>
      <MarkdownContent text={message.text} />
    </article>
  );
}

function ConversationReasoning({ item }: { item: ParsedReasoning }) {
  return (
    <article className="rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
        <span>assistant 思考</span>
        <span className="font-normal text-slate-500">{formatDate(item.timestamp)}</span>
      </div>
      <MarkdownContent className="text-slate-700 dark:text-slate-300" text={item.summaryText} />
    </article>
  );
}
