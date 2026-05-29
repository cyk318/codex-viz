import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProjectSummary, SearchResult, SessionSummary } from '../lib/types';
import { formatCompactNumber, formatDate, formatNumber, formatRateLimitLabel, formatUsd, shortPath, sumTokens } from '../lib/format';
import { UsageBanner } from '../components/UsageBanner';

export function SessionList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pricingStatus, setPricingStatus] = useState<string>('内置价格表');
  const [refreshingPricing, setRefreshingPricing] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadData() {
    return Promise.all([api.sessions(), api.projects()])
      .then(([sessionData, projectData]) => {
        setSessions(sessionData);
        setProjects(projectData);
      });
  }

  useEffect(() => {
    loadData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      api.search(query).then(setSearchResults).catch((err) => setError(err.message));
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const filtered = useMemo(() => (
    project === 'all' ? sessions : sessions.filter((session) => session.cwd === project)
  ), [project, sessions]);

  async function refreshPricing() {
    setRefreshingPricing(true);
    setError(null);
    try {
      const snapshot = await api.refreshPricing();
      await loadData();
      const suffix = snapshot.warnings?.length ? ` · ${snapshot.warnings.length} 条警告` : '';
      setPricingStatus(`官方价格表 ${new Date(snapshot.updatedAt).toLocaleTimeString()}${suffix}`);
    } catch (err) {
      setError((err as Error).message);
      setPricingStatus('价格刷新失败');
    } finally {
      setRefreshingPricing(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">项目</div>
        <button className={`block w-full px-3 py-2 text-left text-sm ${project === 'all' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`} onClick={() => setProject('all')}>
          全部 sessions · {sessions.length}
        </button>
        <div className="max-h-[calc(100vh-170px)] overflow-auto">
          {projects.map((item) => (
            <button key={item.id} className={`block w-full border-t border-slate-100 px-3 py-2 text-left text-sm dark:border-slate-800 ${project === item.cwd ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`} onClick={() => setProject(item.cwd)}>
              <div className="truncate font-medium">{shortPath(item.cwd)}</div>
              <div className="text-xs text-slate-500">{item.sessionCount} 个 sessions · {formatNumber(item.totalTokens)} tokens</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <UsageBanner sessions={sessions} />
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Sessions</h1>
            <p className="text-sm text-slate-500">{loading ? '正在加载本地 JSONL 文件...' : `${filtered.length} 个 sessions`}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              className="h-10 rounded bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow disabled:cursor-not-allowed disabled:bg-blue-400 disabled:shadow-none dark:bg-blue-500 dark:hover:bg-blue-400"
              disabled={refreshingPricing}
              onClick={refreshPricing}
              title="从 OpenAI 官方 pricing 页面同步最新 token 售价，并重新计算费用估算"
            >
              {refreshingPricing ? '同步中...' : '同步官方售价'}
            </button>
            <input
              className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 sm:w-80"
              placeholder="搜索消息、命令、patch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="mb-3 text-xs text-slate-500">费用估算使用：{pricingStatus}</div>

        {error ? <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}

        {searchResults.length ? (
          <div className="mb-4 rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-3 text-sm font-semibold dark:border-slate-800">搜索结果</div>
            {searchResults.map((result) => (
              <Link key={result.sessionId} to={`/sessions/${result.sessionId}`} className="block border-t border-slate-100 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                <div className="font-medium">{result.title}</div>
                <div className="text-xs text-slate-500">{shortPath(result.cwd)} · {formatDate(result.startedAt)}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{result.matches[0]?.excerpt}</div>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-[minmax(260px,1fr)_110px_110px_120px_120px] gap-3 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 max-lg:hidden">
            <div>标题</div>
            <div>Turns</div>
            <div>工具</div>
            <div>Tokens</div>
            <div>开始时间</div>
          </div>
          {filtered.map((session) => (
            <Link key={session.id} to={`/sessions/${session.id}`} className="grid gap-2 border-b border-slate-100 px-3 py-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 lg:grid-cols-[minmax(260px,1fr)_110px_110px_120px_120px] lg:gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{session.title}</div>
                <div className="truncate text-xs text-slate-500">{shortPath(session.cwd)} · {session.model || '-'} · {session.gitBranch || '-'}</div>
                <div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {formatRateLimitLabel(session.rateLimits)}
                </div>
              </div>
              <div className="self-center">{session.turnCount}</div>
              <div className="self-center">{session.toolCallCount}</div>
              <div className="self-center" title={`${formatNumber(sumTokens(session.totalTokens))} tokens，预估 ${formatUsd(session.estimatedCostUsd)}`}>
                <div>{formatCompactNumber(sumTokens(session.totalTokens))}</div>
                <div className="text-xs text-slate-500">{formatUsd(session.estimatedCostUsd)}</div>
              </div>
              <div className="self-center">{formatDate(session.startedAt)}</div>
            </Link>
          ))}
          {!loading && filtered.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">没有找到 sessions。</div> : null}
        </div>
      </section>
    </main>
  );
}
