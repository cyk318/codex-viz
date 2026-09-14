import type {
  ParsedMessage,
  ParsedReasoning,
  SessionDetail
} from '../lib/types';
import { formatDate } from '../lib/format';
import { MarkdownContent } from '../components/MarkdownContent';

type ConversationItem =
  | {
      type: 'message';
      timestamp: string;
      entryIndex: number;
      item: ParsedMessage;
    }
  | {
      type: 'reasoning';
      timestamp: string;
      entryIndex: number;
      item: ParsedReasoning;
    };

export function Conversation({ session }: { session: SessionDetail }) {
  const items: ConversationItem[] = [
    ...session.messages
      .filter(
        (message) => message.role === 'user' || message.role === 'assistant'
      )
      .map((item) => ({
        type: 'message' as const,
        timestamp: item.timestamp,
        entryIndex: item.entryIndex,
        item
      })),
    ...session.reasoning
      .filter((item) => item.summaryText.trim())
      .map((item) => ({
        type: 'reasoning' as const,
        timestamp: item.timestamp,
        entryIndex: item.entryIndex,
        item
      }))
  ].sort((a, b) => a.entryIndex - b.entryIndex);

  return (
    <div className="conversation-stack">
      <div className="conversation-note">
        对话与思考的完整轨迹 · 点击「工具」或「完整事件流」探索执行细节。
      </div>
      {items.map((entry) =>
        entry.type === 'message' ? (
          <ConversationMessage
            key={`${entry.type}-${entry.entryIndex}`}
            message={entry.item}
          />
        ) : (
          <ConversationReasoning
            key={`${entry.type}-${entry.entryIndex}`}
            item={entry.item}
          />
        )
      )}
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
  if (
    isUser &&
    /^\s*(<environment_context>|# AGENTS\.md instructions)/.test(message.text)
  ) {
    return (
      <details className="conversation-context">
        <summary>
          会话环境与项目说明 <span>{formatDate(message.timestamp)}</span>
        </summary>
        <div>
          <MarkdownContent text={message.text} />
        </div>
      </details>
    );
  }
  return (
    <article
      className={`conversation-message ${isUser ? 'user-message' : 'assistant-message'}`}
    >
      <header>
        <span className="speaker-avatar">{isUser ? 'YOU' : '✳'}</span>
        <strong>{isUser ? '你' : 'CODEX'}</strong>
        {message.phase ? <span>{message.phase}</span> : null}
        <time>{formatDate(message.timestamp)}</time>
      </header>
      <MarkdownContent text={message.text} />
    </article>
  );
}

function ConversationReasoning({ item }: { item: ParsedReasoning }) {
  return (
    <details className="reasoning-message">
      <summary>
        思考轨迹 <span>{formatDate(item.timestamp)}</span>
      </summary>
      <div className="reasoning-body">
        <MarkdownContent text={item.summaryText} />
      </div>
    </details>
  );
}
