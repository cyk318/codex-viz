import type { SessionDetail, SessionSummary } from '../lib/types';
import { parseSessionFileUncached } from './parser';

type CacheEntry = {
  mtimeMs: number;
  size: number;
  summary: SessionSummary;
  detail?: SessionDetail;
};

const cache = new Map<string, CacheEntry>();

export function clearSessionCache() {
  cache.clear();
}

export async function parseSessionFile(filePath: string, detail: true): Promise<SessionDetail>;
export async function parseSessionFile(filePath: string, detail?: false): Promise<SessionSummary>;
export async function parseSessionFile(filePath: string, detail = false) {
  const stat = await Bun.file(filePath).stat();
  const cached = cache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    if (!detail) return cached.summary;
    if (cached.detail) return cached.detail;
  }

  if (detail) {
    const parsed = await parseSessionFileUncached(filePath, true);
    cache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      summary: parsed,
      detail: parsed
    });
    return parsed;
  }

  const parsed = await parseSessionFileUncached(filePath, false);
  cache.set(filePath, {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    summary: parsed
  });
  return parsed;
}
