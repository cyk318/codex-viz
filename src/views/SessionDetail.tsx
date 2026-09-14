import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import {
  formatCny,
  formatCompactNumber,
  formatDate,
  formatNumber,
  formatRateLimitLabel,
  shortPath,
  sumTokens
} from '../lib/format';
import { Timeline } from './Timeline';
import { Conversation } from './Conversation';
import { ToolCalls } from './ToolCalls';
import { TokenChart } from './TokenChart';
import { TurnGraph } from './TurnGraph';
import { Icon, type IconName } from '../components/Icon';
import { RawEvents } from '../components/RawEvents';

const tabs = [
  'conversation',
  'timeline',
  'tools',
  'tokens',
  'graph',
  'raw'
] as const;
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
  const active = tabs.includes(params.get('tab') as never)
    ? params.get('tab')!
    : 'conversation';
  const { data, error, loading } = useSession(id);

  if (loading)
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8 text-sm text-slate-500">
        正在加载 session...
      </main>
    );
  if (error || !data)
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8 text-sm text-red-600">
        {error || '未找到 session'}
      </main>
    );

  return (
    <main className="detail-page">
      <Link to="/" className="back-link">
        <Icon name="back" size={15} />
        返回任务档案
      </Link>
      <div className="detail-heading">
        <div className="eyebrow">
          <Icon name="terminal" size={15} /> SESSION / {data.id.slice(0, 8)}
        </div>
        <h1>{data.title}</h1>
        <div className="detail-facts">
          <span>
            <Icon name="folder" size={14} />
            {shortPath(data.cwd)}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {formatDate(data.startedAt)}
          </span>
          <span>
            <Icon name="branch" size={14} />
            {data.gitBranch || '无分支记录'}
          </span>
          <span>
            <span className="status-dot" />
            {data.model || '未知模型'}
          </span>
        </div>
        {data.parseWarnings.length ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {data.parseWarnings.length} 条解析警告。页面已跳过无效行，并保留该
            session 的其他内容。
          </div>
        ) : null}
      </div>

      <div className="detail-metrics">
        <div>
          <small>对话轮次</small>
          <strong>
            {data.turnCount}
            <span className="text-xs text-slate-500">
              {' '}
              / {data.messageCount} 条消息
            </span>
          </strong>
        </div>
        <div>
          <small>工具调用</small>
          <strong>{data.toolCallCount}</strong>
        </div>
        <div>
          <small>TOKEN 用量</small>
          <strong>{formatCompactNumber(sumTokens(data.totalTokens))}</strong>
        </div>
        <div>
          <small>API 等价预估 · CNY</small>
          <strong>{formatCny(data.estimatedCostCny)}</strong>
        </div>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="任务详情视图">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            id={`tab-${tab}`}
            aria-controls={`panel-${tab}`}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                return;
              event.preventDefault();
              const next =
                tabs[
                  (tabs.indexOf(tab) +
                    (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) %
                    tabs.length
                ];
              setParams({ tab: next });
              document.getElementById(`tab-${next}`)?.focus();
            }}
            onClick={() => setParams({ tab })}
          >
            <Icon
              name={
                (
                  {
                    conversation: 'message',
                    timeline: 'clock',
                    tools: 'terminal',
                    tokens: 'chart',
                    graph: 'branch',
                    raw: 'code'
                  } as Record<string, IconName>
                )[tab]
              }
              size={16}
            />
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div
        className="tab-content"
        key={active}
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
      >
        {active === 'conversation' ? <Conversation session={data} /> : null}
        {active === 'timeline' ? <Timeline session={data} /> : null}
        {active === 'tools' ? <ToolCalls calls={data.toolCalls} /> : null}
        {active === 'tokens' ? <TokenChart session={data} /> : null}
        {active === 'graph' ? <TurnGraph graph={data.graph} /> : null}
        {active === 'raw' ? (
          <RawEvents entries={data.entries} sessionId={data.id} />
        ) : null}
      </div>
    </main>
  );
}
