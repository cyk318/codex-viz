import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSessionFileUncached } from './parser';
import { getPricingSnapshot } from './pricing';

const context = (model: string) => ({ type: 'turn_context', payload: { model } });
const usage = (input: number, output = 0) => ({ type: 'event_msg', payload: { type: 'token_count', info: {
  total_token_usage: { input_tokens: input, output_tokens: output },
  last_token_usage: { input_tokens: 150_000, output_tokens: output }
} } });
async function parse(entries: unknown[]) {
  const dir = await mkdtemp(join(tmpdir(), 'codex-viz-test-'));
  try {
    const path = join(dir, 'session.jsonl');
    await Bun.write(path, entries.map(e => JSON.stringify(e)).join('\n'));
    return await parseSessionFileUncached(path);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('deduplicates counts and bills each model without using cumulative context length', async () => {
  const result = await parse([context('gpt-6-astra'), usage(150_000), usage(150_000),
    context('gpt-5.6-sol'), usage(300_000), usage(450_000)]);
  expect(result.estimatedCostCny).toBeCloseTo((1.5 + 0.6 + 0.6) * getPricingSnapshot().usdToCnyRate);
});

test('unknown model usage cannot silently become a partial known cost', async () => {
  const result = await parse([context('unknown'), usage(100), context('gpt-6-astra'), usage(200)]);
  expect(result.estimatedCostCny).toBeNull();
});

test('missing usage stays unknown and cumulative resets add new usage', async () => {
  expect((await parse([context('gpt-6-astra')])).estimatedCostCny).toBeNull();
  const result = await parse([context('gpt-6-astra'), usage(150_000), usage(100_000)]);
  expect(result.estimatedCostCny).toBeCloseTo(2.5 * getPricingSnapshot().usdToCnyRate);
});
