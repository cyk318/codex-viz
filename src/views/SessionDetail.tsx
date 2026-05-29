import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { formatDate, formatNumber, formatRateLimitLabel, shortPath, sumTokens } from '../lib/format';
import { Timeline } from './Timeline';
import { Conversation } from './Conversation';
import { ToolCalls } from './ToolCalls';
import { TokenChart } from './TokenChart';
import { TurnGraph } from './TurnGraph';
import { CodeBlock } from '../components/CodeBlock';

const tabs = ['conversation', 'timeline', 'tools', 'tokens', 'graph', 'raw'] as const;
const tabLabels: Record<(typeof tabs)[number], string> = {
  conversation: '对话',
  timeline: '完整事件流',
  tools: '工具',
  tokens: 'Tokens',
  graph: '调用图',
  raw: 'Raw'
};

export function SessionDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const active = tabs.includes(params.get('tab') as never) ? params.get('tab')! : 'conversation';
  const { data, error, loading } = useSession(id);

  if (loading) return <main className="mx-auto max-w-[1500px] px-4 py-8 text-sm text-slate-500">正在加载 session...</main>;
  if (error || !data) return <main className="mx-auto max-w-[1500px] px-4 py-8 text-sm text-red-600">{error || '未找到 session'}</main>;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-4">
      <Link to="/" className="text-sm text-blue-700 dark:text-blue-300">返回 sessions</Link>
      <div className="mt-3 rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="break-words text-lg font-semibold">{data.title}</h1>
        <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
          <div>{shortPath(data.cwd)}</div>
          <div>{formatDate(data.startedAt)} - {formatDate(data.endedAt)}</div>
          <div>{data.turnCount} 个 turns · {data.messageCount} 条消息 · {data.toolCallCount} 次工具调用</div>
          <div>{formatNumber(sumTokens(data.totalTokens))} tokens · {formatRateLimitLabel(data.rateLimits)} · {data.model || '-'}</div>
        </div>
        {data.parseWarnings.length ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {data.parseWarnings.length} 条解析警告。页面已跳过无效行，并保留该 session 的其他内容。
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded px-3 py-1.5 text-sm ${active === tab ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
            onClick={() => setParams({ tab })}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {active === 'conversation' ? <Conversation session={data} /> : null}
        {active === 'timeline' ? <Timeline session={data} /> : null}
        {active === 'tools' ? <ToolCalls calls={data.toolCalls} /> : null}
        {active === 'tokens' ? <TokenChart session={data} /> : null}
        {active === 'graph' ? <TurnGraph graph={data.graph} /> : null}
        {active === 'raw' ? <CodeBlock value={data.entries} /> : null}
      </div>
    </main>
  );
}
