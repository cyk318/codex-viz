import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clearSessionCache, parseSessionFile } from './cache';

test('opening detail or searching does not put full logs in subsequent session lists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-viz-cache-'));
  try {
    const path = join(dir, 'session.jsonl');
    await Bun.write(
      path,
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'A large conversation' }]
        }
      })
    );
    const detail = await parseSessionFile(path, true);
    expect(detail.entries).toHaveLength(1);
    const summary = await parseSessionFile(path);
    expect(summary.title).toBe(detail.title);
    for (const field of [
      'entries',
      'messages',
      'reasoning',
      'turns',
      'toolCalls',
      'tokenPoints',
      'graph',
      'parseWarnings'
    ])
      expect(summary).not.toHaveProperty(field);
    expect(await parseSessionFile(path, true)).toBe(detail);
  } finally {
    clearSessionCache();
    await rm(dir, { recursive: true, force: true });
  }
});
