import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import type { SessionSummary } from '../lib/types';
import { parseSessionFile } from './cache';

export const CODEX_SESSIONS_DIR = join(Bun.env.HOME || '', '.codex', 'sessions');

export async function assertCodexSessionsDir() {
  const stat = await Bun.file(CODEX_SESSIONS_DIR).stat().catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Codex sessions directory not found: ${CODEX_SESSIONS_DIR}`);
  }
}

export async function scanSessionFiles(dir = CODEX_SESSIONS_DIR): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string) {
    const items = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const item of items) {
      const path = join(current, item.name);
      if (item.isDirectory()) {
        await walk(path);
      } else if (item.isFile() && item.name.endsWith('.jsonl')) {
        files.push(path);
      }
    }
  }

  await walk(dir);
  return files.sort().reverse();
}

export async function getSessionSummaries(): Promise<SessionSummary[]> {
  const files = await scanSessionFiles();
  const summaries = await Promise.all(files.map(async (filePath) => parseSessionFile(filePath, false)));
  return summaries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function findSessionFileById(id: string) {
  const files = await scanSessionFiles();
  for (const filePath of files) {
    if (filePath.includes(id)) return filePath;
  }
  const summaries = await getSessionSummaries();
  return summaries.find((session) => session.id === id)?.filePath ?? null;
}

export function stableProjectId(cwd: string) {
  let hash = 5381;
  for (let i = 0; i < cwd.length; i += 1) {
    hash = ((hash << 5) + hash) ^ cwd.charCodeAt(i);
  }
  return `p_${(hash >>> 0).toString(36)}`;
}
