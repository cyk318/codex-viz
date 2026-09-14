import { afterEach, expect, test } from 'bun:test';
import { calcCostCny, getPricingSnapshot, parseOfficialPricing, refreshPricingFromOfficial } from './pricing';

const rate = getPricingSnapshot().usdToCnyRate;
const table = `### Standard pricing data
| Model | Short context input | Short context cached input | Short context cache writes | Short context output | Long context input | Long context cached input | Long context cache writes | Long context output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | $10.00 | $1.00 | $12.50 | $50.00 | $20.00 | $2.00 | $25.00 | $75.00 |
| gpt-5.5 (<272K context length) | $5.00 | $0.50 | - | $30.00 | $10.00 | $1.00 | - | $45.00 |
### Batch pricing data
| gpt-6-astra | $5.00 | $0.50 | $6.25 | $25.00 | $10.00 | $1.00 | $12.50 | $37.50 |`;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('uses model-specific prices and only resolves dated snapshots', () => {
  expect(calcCostCny('gpt-5.6-sol', { output_tokens: 1_000_000 })).toBeCloseTo(20 * rate);
  expect(calcCostCny(' GPT-6-ASTRA-2026-09-01 ', { output_tokens: 1_000_000 })).toBeCloseTo(50 * rate);
  expect(calcCostCny('gpt-5.9', { input_tokens: 100 })).toBeNull();
  expect(calcCostCny('gpt-5.5-mystery', { input_tokens: 100 })).toBeNull();
});

test('separates cache reads and writes and does not double charge reasoning', () => {
  expect(calcCostCny('gpt-6-astra', { input_tokens: 100_000, cached_input_tokens: 60_000,
    cache_write_input_tokens: 20_000, output_tokens: 10_000, reasoning_output_tokens: 5_000 }))
    .toBeCloseTo((0.2 + 0.06 + 0.25 + 0.5) * rate);
});

test('long context applies only above 272K input, including cache rates', () => {
  expect(calcCostCny('gpt-6-astra', { input_tokens: 272_000, cached_input_tokens: 272_000 })).toBeCloseTo(0.272 * rate);
  expect(calcCostCny('gpt-6-astra', { input_tokens: 272_001, cached_input_tokens: 272_001 })).toBeCloseTo(0.544002 * rate);
});

test('parses Markdown columns without overwriting Standard with Batch', () => {
  const parsed = parseOfficialPricing(table);
  expect(parsed['gpt-6-astra']).toEqual({ input: 10, cached_input: 1, cache_write: 12.5, output: 50,
    long_context: { input: 20, cached_input: 2, cache_write: 25, output: 75 } });
  expect(parsed['gpt-5.5'].cache_write).toBeUndefined();
  expect(parseOfficialPricing('<html>error</html>')).toEqual({});
});

test('failed refresh preserves last successful prices and timestamp', async () => {
  globalThis.fetch = (async () => new Response(table)) as unknown as typeof fetch;
  const good = await refreshPricingFromOfficial();
  globalThis.fetch = (async () => new Response('Unavailable', { status: 503 })) as unknown as typeof fetch;
  const failed = await refreshPricingFromOfficial();
  expect(failed.models).toEqual(good.models);
  expect(failed.updatedAt).toBe(good.updatedAt);
  expect(failed.source).toBe('official');
  expect(failed.warnings).toHaveLength(1);
});
