import type { ProjectSummary, SearchResult } from '../lib/types';
import { excerpt, sumTokens } from '../lib/format';
import { clearSessionCache, parseSessionFile } from './cache';
import { getPricingSnapshot, refreshPricingFromOfficial } from './pricing';
import { findSessionFileById, getSessionSummaries, stableProjectId } from './scanner';

export async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  try {
    if (url.pathname === '/api/projects') {
      return json(await projects());
    }
    if (url.pathname === '/api/sessions') {
      return json(await getSessionSummaries());
    }
    if (url.pathname === '/api/search') {
      return json(await search(url.searchParams.get('q') || ''));
    }
    if (url.pathname === '/api/pricing') {
      return json(getPricingSnapshot());
    }
    if (url.pathname === '/api/pricing/refresh' && req.method === 'POST') {
      const snapshot = await refreshPricingFromOfficial();
      clearSessionCache();
      return json(snapshot);
    }
    const rawMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/raw$/);
    if (rawMatch) {
      const filePath = await findSessionFileById(decodeURIComponent(rawMatch[1]));
      if (!filePath) return json({ error: 'Session not found' }, 404);
      return new Response(await Bun.file(filePath).text(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    const detailMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (detailMatch) {
      const id = decodeURIComponent(detailMatch[1]);
      const filePath = await findSessionFileById(id);
      if (!filePath) return json({ error: 'Session not found' }, 404);
      return json(await parseSessionFile(filePath, true));
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
}

async function projects(): Promise<ProjectSummary[]> {
  const sessions = await getSessionSummaries();
  const map = new Map<string, ProjectSummary>();
  for (const session of sessions) {
    const existing = map.get(session.cwd);
    const totalTokens = sumTokens(session.totalTokens);
    if (!existing) {
      map.set(session.cwd, {
        id: stableProjectId(session.cwd),
        cwd: session.cwd,
        sessionCount: 1,
        totalTokens,
        lastActiveAt: session.endedAt
      });
      continue;
    }
    existing.sessionCount += 1;
    existing.totalTokens += totalTokens;
    if (session.endedAt > existing.lastActiveAt) existing.lastActiveAt = session.endedAt;
  }
  return [...map.values()].sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

async function search(q: string): Promise<SearchResult[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const sessions = await getSessionSummaries();
  const results: SearchResult[] = [];
  for (const summary of sessions) {
    const detail = await parseSessionFile(summary.filePath, true);
    const matches: SearchResult['matches'] = [];
    for (const message of detail.messages) {
      if (message.text.toLowerCase().includes(needle)) {
        matches.push({ type: 'message', timestamp: message.timestamp, excerpt: excerpt(message.text, 180) });
      }
    }
    for (const call of detail.toolCalls) {
      const haystack = `${call.name}\n${call.rawArguments}\n${call.output || ''}`.toLowerCase();
      if (haystack.includes(needle)) {
        matches.push({ type: 'tool', timestamp: call.timestamp, excerpt: excerpt(`${call.name}: ${call.rawArguments || call.output || ''}`, 180) });
      }
    }
    if (matches.length) {
      results.push({
        sessionId: detail.id,
        filePath: detail.filePath,
        cwd: detail.cwd,
        title: detail.title,
        startedAt: detail.startedAt,
        matches: matches.slice(0, 8)
      });
    }
  }
  return results.slice(0, 50);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
