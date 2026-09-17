import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type {
  PricingSnapshot,
  ProjectSummary,
  SearchResult,
  SessionSummary
} from '../lib/types';
import {
  formatCny,
  formatCompactNumber,
  formatDate,
  formatRateLimitLabel,
  shortPath,
  sumTokens
} from '../lib/format';
import { Icon } from '../components/Icon';
import { UsageBanner } from '../components/UsageBanner';

type CopiedCommand = {
  sessionId: string;
  command: string;
  kind: 'resume' | 'dangerous';
};

export function SessionList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pricingStatus, setPricingStatus] =
    useState<string>('正在读取价格表...');
  const [refreshingPricing, setRefreshingPricing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState<CopiedCommand | null>(
    null
  );
  const [deletedTitle, setDeletedTitle] = useState<string | null>(null);
  const [cleaningSessions, setCleaningSessions] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  useEffect(() => {
    const closeMenus = (event: Event) => {
      document
        .querySelectorAll<HTMLDetailsElement>('.action-menu[open]')
        .forEach((menu) => {
          if (
            event instanceof KeyboardEvent
              ? event.key === 'Escape'
              : !menu.contains(event.target as Node)
          )
            menu.open = false;
        });
    };
    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, []);

  function loadData() {
    return Promise.all([api.sessions(), api.projects(), api.pricing()]).then(
      ([sessionData, projectData, pricing]) => {
        setSessions(sessionData);
        setProjects(projectData);
        setPricingStatus(formatPricingStatus(pricing));
      }
    );
  }

  useEffect(() => {
    loadData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let stale = false;
    setSearchResults([]);
    setSearching(Boolean(query.trim()));
    const id = window.setTimeout(() => {
      if (!query.trim()) return;
      api
        .search(query)
        .then((results) => {
          if (!stale) setSearchResults(results);
        })
        .catch((err) => {
          if (!stale) setError(err.message);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, 300);
    return () => {
      stale = true;
      window.clearTimeout(id);
    };
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [project, sort]);
  const filtered = useMemo(() => {
    const items =
      project === 'all'
        ? [...sessions]
        : sessions.filter((session) => session.cwd === project);
    return items.sort((a, b) =>
      sort === 'tokens'
        ? sumTokens(b.totalTokens) - sumTokens(a.totalTokens)
        : sort === 'cost'
          ? (b.estimatedCostCny ?? -1) - (a.estimatedCostCny ?? -1)
          : b.startedAt.localeCompare(a.startedAt)
    );
  }, [project, sessions, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);

  async function refreshPricing() {
    setRefreshingPricing(true);
    setError(null);
    try {
      const snapshot = await api.refreshPricing();
      await loadData();
      setPricingStatus(formatPricingStatus(snapshot));
    } catch (err) {
      setError((err as Error).message);
      setPricingStatus('价格刷新失败');
    } finally {
      setRefreshingPricing(false);
    }
  }

  async function copyResumeCommand(sessionId: string, dangerous = false) {
    const command = dangerous
      ? `codex --dangerously-bypass-approvals-and-sandbox resume ${sessionId}`
      : `codex resume ${sessionId}`;
    try {
      await navigator.clipboard.writeText(command);
      const copied = {
        sessionId,
        command,
        kind: dangerous ? ('dangerous' as const) : ('resume' as const)
      };
      setCopiedCommand(copied);
      window.setTimeout(() => {
        setCopiedCommand((current) =>
          current?.command === command ? null : current
        );
      }, 1200);
    } catch (err) {
      setError((err as Error).message || '复制 resume 命令失败');
    }
  }

  async function deleteSession(session: SessionSummary) {
    const confirmed = window.confirm(
      `确定要删除这个 session 吗？\n\n${session.title}\n${session.id}\n\n删除后将移除本地 JSONL 文件，无法在此页面恢复。`
    );
    if (!confirmed) return;
    setError(null);
    try {
      await api.deleteSession(session.id);
      setDeletedTitle(session.title);
      setSearchResults((results) =>
        results.filter((result) => result.sessionId !== session.id)
      );
      await loadData();
      window.setTimeout(() => {
        setDeletedTitle((current) =>
          current === session.title ? null : current
        );
      }, 2000);
    } catch (err) {
      setError((err as Error).message || '删除 session 失败');
    }
  }

  async function cleanupExpiredSessions() {
    const confirmed = window.confirm(
      '确定要清理 30 天以前的 sessions 吗？\n\n将永久删除这些 session 的本地 JSONL 文件，无法在此页面恢复。'
    );
    if (!confirmed) return;
    setCleaningSessions(true);
    setCleanupMessage(null);
    setError(null);
    try {
      const result = await api.cleanupSessions();
      setSearchResults([]);
      await loadData();
      setCleanupMessage(
        result.deletedCount > 0
          ? `已清理 ${result.deletedCount} 个 30 天以前的 sessions。`
          : '没有需要清理的 session。'
      );
    } catch (err) {
      setError((err as Error).message || '清理 sessions 失败');
    } finally {
      setCleaningSessions(false);
    }
  }

  return (
    <main className="workspace-page">
      <UsageBanner sessions={sessions} />
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE ARCHIVE</div>
          <h2>
            任务档案 <span>{sessions.length.toString().padStart(2, '0')}</span>
          </h2>
        </div>
        <div className="archive-actions">
          <button
            className="button button-quiet"
            disabled={cleaningSessions}
            onClick={cleanupExpiredSessions}
            title="永久删除 30 天前的本地记录"
          >
            <Icon name="trash" size={15} />
            {cleaningSessions ? '清理中' : '清理旧记录'}
          </button>
          <button
            className="button button-outline"
            disabled={refreshingPricing}
            onClick={refreshPricing}
          >
            <Icon
              name="refresh"
              size={15}
              className={refreshingPricing ? 'spin' : ''}
            />
            {refreshingPricing ? '同步中' : '同步官方售价'}
          </button>
        </div>
      </div>
      <div aria-live="polite" className="notification-area">
        {copiedCommand && (
          <div className="notice success">
            <Icon name="check" /> 已复制续接命令{' '}
            <code>{copiedCommand.command}</code>
          </div>
        )}
        {deletedTitle && <div className="notice">已删除：{deletedTitle}</div>}
        {cleanupMessage && <div className="notice">{cleanupMessage}</div>}
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button
              className="icon-button"
              aria-label="关闭提示"
              onClick={() => setError(null)}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
      <div className="archive-layout">
        <aside className="project-panel">
          <div className="project-heading">
            项目空间 <span>{projects.length}</span>
          </div>
          <button
            className={`project-item ${project === 'all' ? 'selected' : ''}`}
            onClick={() => setProject('all')}
          >
            <Icon name="grid" size={16} />
            <span>全部任务</span>
            <b>{sessions.length}</b>
          </button>
          <div className="project-list">
            {projects.map((item) => (
              <button
                key={item.id}
                className={`project-item ${project === item.cwd ? 'selected' : ''}`}
                onClick={() => setProject(item.cwd)}
                title={item.cwd}
              >
                <Icon name="folder" size={16} />
                <span>{shortPath(item.cwd).split('/').pop()}</span>
                <b>{item.sessionCount}</b>
              </button>
            ))}
          </div>
          <div className="project-foot">
            <Icon name="terminal" size={17} />
            <span>
              灵感在这里
              <br />
              <strong>成为现实。</strong>
            </span>
          </div>
        </aside>
        <section className="archive-main" aria-label="任务列表">
          <div className="list-toolbar">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input
                aria-label="搜索任务内容"
                placeholder="搜索消息、命令或代码…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  className="icon-button"
                  onClick={() => setQuery('')}
                  aria-label="清空搜索"
                >
                  <Icon name="close" size={14} />
                </button>
              ) : (
                <span className="search-hint">全文搜索</span>
              )}
            </label>
            <select
              className="sort-select"
              aria-label="任务排序"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">最近创建</option>
              <option value="tokens">Token 用量</option>
              <option value="cost">预估费用</option>
            </select>
          </div>
          {query.trim() ? (
            <div className="search-results">
              <div className="result-label">
                {searching
                  ? '正在搜索全部任务…'
                  : `${searchResults.length} 个匹配任务`}
              </div>
              {searchResults.map((result) => (
                <Link
                  key={result.sessionId}
                  to={`/sessions/${result.sessionId}`}
                  className="search-result"
                >
                  <Icon name="search" />
                  <div>
                    <h3>{result.title}</h3>
                    <p>{result.matches[0]?.excerpt}</p>
                    <small>
                      {shortPath(result.cwd)} · {formatDate(result.startedAt)}
                    </small>
                    <SessionRemainingUsage
                      rateLimits={sessions.find((session) => session.id === result.sessionId)?.rateLimits}
                    />
                  </div>
                  <Icon name="arrow" />
                </Link>
              ))}
              {!searching && !searchResults.length && (
                <div className="empty-state">
                  <Icon name="search" size={32} />
                  <h3>没有找到这段轨迹</h3>
                  <p>试试其他消息、工具名称或命令。</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="session-table-head">
                <span>任务 / SESSION</span>
                <span>用量 / TOKENS</span>
                <span>上下文</span>
                <span>创建时间</span>
                <span />
              </div>
              {loading ? (
                <div className="skeleton-list" aria-label="正在加载任务">
                  {[1, 2, 3, 4].map((i) => (
                    <div className="skeleton" key={i} />
                  ))}
                </div>
              ) : (
                visible.map((session, index) => (
                  <article
                    key={session.id}
                    className="session-row"
                    style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                  >
                    <div className="session-identity">
                      <span
                        className={`session-glyph ${session.hasErrors ? 'amber' : ''}`}
                      >
                        <Icon
                          name={session.hasPatch ? 'code' : 'message'}
                          size={18}
                        />
                      </span>
                      <div className="session-name">
                        <Link
                          to={`/sessions/${session.id}`}
                          className="session-title"
                          title={session.title}
                        >
                          {session.title}
                        </Link>
                        <div className="session-meta">
                          <span
                            className={`model-dot ${session.model?.includes('astra') ? 'astra' : ''}`}
                          />
                          <span>{session.model || '未知模型'}</span>
                          <span className="meta-separator">/</span>
                          <span title={session.cwd}>
                            {shortPath(session.cwd).split('/').pop()}
                          </span>
                          <span className="turn-count">
                            {session.turnCount} 轮 · {session.toolCallCount}{' '}
                            工具
                          </span>
                        </div>
                        <SessionRemainingUsage rateLimits={session.rateLimits} />
                      </div>
                    </div>
                    <Link
                      to={`/sessions/${session.id}?tab=tokens`}
                      className="token-cell"
                      title={formatRateLimitLabel(session.rateLimits)}
                    >
                      <strong>
                        {formatCompactNumber(sumTokens(session.totalTokens))}
                      </strong>
                      <small>{formatCny(session.estimatedCostCny)}</small>
                    </Link>
                    <ContextTag session={session} />
                    <div className="date-cell">
                      <span>
                        {new Date(session.startedAt).toLocaleDateString(
                          'zh-CN',
                          { month: '2-digit', day: '2-digit' }
                        )}
                      </span>
                      <small>
                        {new Date(session.startedAt).toLocaleTimeString(
                          'zh-CN',
                          { hour: '2-digit', minute: '2-digit', hour12: false }
                        )}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="icon-button resume-button"
                        onClick={() => copyResumeCommand(session.id)}
                        aria-label={`复制续接命令：${session.title}`}
                        title="复制 codex resume 命令"
                      >
                        <Icon
                          name={
                            copiedCommand?.sessionId === session.id
                              ? 'check'
                              : 'terminal'
                          }
                          size={16}
                        />
                      </button>
                      <details className="action-menu">
                        <summary
                          className="icon-button"
                          aria-label={`更多操作：${session.title}`}
                          title="更多操作"
                        >
                          <Icon name="more" size={17} />
                        </summary>
                        <div className="action-dropdown">
                          <button
                            onClick={(event) => {
                              void copyResumeCommand(session.id);
                              event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open');
                            }}
                          >
                            <Icon name="terminal" size={14} />
                            复制续接命令
                          </button>
                          <button
                            onClick={(event) => {
                              void copyResumeCommand(session.id, true);
                              event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open');
                            }}
                          >
                            <Icon name="bolt" size={14} />
                            复制危险模式命令
                          </button>
                          <button
                            className="danger-text"
                            onClick={(event) => {
                              event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open');
                              void deleteSession(session);
                            }}
                          >
                            <Icon name="trash" size={14} />
                            删除本地记录
                          </button>
                        </div>
                      </details>
                    </div>
                  </article>
                ))
              )}
              {!loading && !filtered.length && (
                <div className="empty-state">
                  <Icon name="orbit" size={36} />
                  <h3>下一次探索，从这里开始</h3>
                  <p>这个项目还没有任务记录。</p>
                </div>
              )}
              <div className="list-pagination">
                <span>
                  共 {filtered.length} 个任务{' '}
                  <span className="pagination-muted">/ 每页 20 条</span>
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="上一页"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <Icon name="back" size={16} />
                  </button>
                  <span>
                    {currentPage} <em>/ {pageCount}</em>
                  </span>
                  <button
                    className="icon-button"
                    aria-label="下一页"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <Icon name="arrow" size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <div className="pricing-footnote">
        <Icon name="shield" size={13} />
        <span>{pricingStatus} · Standard API 等价估算，非订阅实际扣费</span>
      </div>
    </main>
  );
}

function SessionRemainingUsage({
  rateLimits
}: {
  rateLimits: SessionSummary['rateLimits'] | undefined;
}) {
  const label = formatRateLimitLabel(rateLimits);
  return (
    <div
      className="session-remaining-usage"
      title="此 session 最后一次有效记录的剩余额度"
    >
      <span>最后剩余额度</span>
      <span>{label === '-' ? '暂无记录' : label}</span>
    </div>
  );
}

function ContextTag({ session }: { session: SessionSummary }) {
  const usage = contextUsage(session);
  if (usage == null)
    return (
      <div className="context-cell">
        <span>—</span>
        <small>暂无记录</small>
      </div>
    );
  const percentage = Math.round(usage * 100);
  return (
    <div
      className={`context-cell ${percentage > 75 ? 'high' : ''}`}
      title={`上下文占用 ${percentage}%，剩余 ${formatCompactNumber(session.remainingTokens)} tokens`}
    >
      <span>
        {percentage}
        <small>%</small>
      </span>
      <div className="context-meter">
        <i style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function contextUsage(session: SessionSummary) {
  if (
    session.contextWindow == null ||
    session.contextWindow <= 0 ||
    session.remainingTokens == null
  )
    return null;
  return Math.min(
    1,
    Math.max(
      0,
      (session.contextWindow - session.remainingTokens) / session.contextWindow
    )
  );
}

function formatPricingStatus(snapshot: PricingSnapshot) {
  const source = snapshot.source === 'official' ? '官方价格表' : '内置价格表';
  const updatedAt = snapshot.updatedAt
    ? ` ${new Date(snapshot.updatedAt).toLocaleTimeString()}`
    : '';
  const warnings = snapshot.warnings.length
    ? ` · ${snapshot.warnings.length} 条警告`
    : '';
  return `${source}${updatedAt} · 1 USD = ¥${snapshot.usdToCnyRate.toFixed(2)}${warnings}`;
}
