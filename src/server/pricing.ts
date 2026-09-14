import type { CodexTokenUsage, ModelPricing, PricingSnapshot } from '../lib/types';

const DEFAULT_USD_TO_CNY_RATE = 7.2;
const USD_TO_CNY_RATE = readUsdToCnyRate();

// Official Standard USD / 1M tokens, verified 2026-09-14.
// https://developers.openai.com/api/docs/pricing
const BUILT_IN_PRICING: Record<string, ModelPricing> = {
  'gpt-6-astra': { input: 10, cached_input: 1, cache_write: 12.5, output: 50, long_context: { input: 20, cached_input: 2, cache_write: 25, output: 75 } },
  'gpt-5.6-sol': { input: 4, cached_input: 0.4, cache_write: 5, output: 20, long_context: { input: 8, cached_input: 0.8, cache_write: 10, output: 30 } },
  'gpt-5.6-terra': { input: 2, cached_input: 0.2, cache_write: 2.5, output: 12, long_context: { input: 4, cached_input: 0.4, cache_write: 5, output: 18 } },
  'gpt-5.6-luna': { input: 0.2, cached_input: 0.02, cache_write: 0.25, output: 1.2, long_context: { input: 0.4, cached_input: 0.04, cache_write: 0.5, output: 1.8 } },
  'gpt-5.5': { input: 5, cached_input: 0.5, output: 30, long_context: { input: 10, cached_input: 1, output: 45 } },
  'gpt-5.5-pro': { input: 30, output: 180, long_context: { input: 60, output: 270 } },
  'gpt-5.4': { input: 2.5, cached_input: 0.25, output: 15, long_context: { input: 5, cached_input: 0.5, output: 22.5 } },
  'gpt-5.4-mini': { input: 0.75, cached_input: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cached_input: 0.02, output: 1.25 },
  'gpt-5.3-codex': { input: 1.75, cached_input: 0.175, output: 14 },
  'gpt-5.1-codex-mini': { input: 0.25, cached_input: 0.025, output: 2 },
  'codex-mini-latest': { input: 1.5, cached_input: 0.375, output: 6 },
  'gpt-5.2-codex': { input: 1.75, cached_input: 0.175, output: 14 },
  'gpt-5.1-codex-max': { input: 1.25, cached_input: 0.125, output: 10 },
  'gpt-5.1-codex': { input: 1.25, cached_input: 0.125, output: 10 },
  'gpt-5-codex': { input: 1.25, cached_input: 0.125, output: 10 },
  'gpt-5.2': { input: 1.75, cached_input: 0.175, output: 14 },
  'gpt-5.1': { input: 1.25, cached_input: 0.125, output: 10 },
  'gpt-5': { input: 1.25, cached_input: 0.125, output: 10 },
  'gpt-5-mini': { input: 0.25, cached_input: 0.025, output: 2 },
  'gpt-5-nano': { input: 0.05, cached_input: 0.005, output: 0.4 }
};

let activePricing: PricingSnapshot = {
  source: 'built-in',
  updatedAt: null,
  models: { ...BUILT_IN_PRICING },
  warnings: [],
  usdToCnyRate: USD_TO_CNY_RATE
};

// usage must describe one request; cumulative session input is not context length.
export function calcCostCny(model: string | null, usage: CodexTokenUsage): number | null {
  const base = pricingForModel(model);
  if (!base) return null;
  const pricing = (usage.input_tokens ?? 0) > 272_000 ? base.long_context ?? base : base;
  const inputTokens = Math.max(0, usage.input_tokens ?? 0);
  const cachedTokens = Math.min(inputTokens, Math.max(0, usage.cached_input_tokens ?? 0));
  const writeTokens = Math.min(inputTokens - cachedTokens, Math.max(0, usage.cache_write_input_tokens ?? 0));
  const input = (inputTokens - cachedTokens - writeTokens) * pricing.input;
  const cached = cachedTokens * (pricing.cached_input ?? pricing.input);
  const writes = writeTokens * (pricing.cache_write ?? pricing.input);
  // Reasoning tokens are included in output_tokens, not an additional charge.
  const output = Math.max(0, usage.output_tokens ?? 0) * pricing.output;
  return (input + cached + writes + output) / 1_000_000 * USD_TO_CNY_RATE;
}

export function getPricingSnapshot() {
  return activePricing;
}

export async function refreshPricingFromOfficial(): Promise<PricingSnapshot> {
  try {
    const text = await fetchOfficialText('https://developers.openai.com/api/docs/pricing.md');
    const parsed = parseOfficialPricing(text);
    if (!Object.keys(parsed).length) throw new Error('未解析到官方 Standard 价格表，保留上次价格。');
    activePricing = {
      ...activePricing,
      source: 'official',
      updatedAt: new Date().toISOString(),
      models: { ...activePricing.models, ...parsed },
      warnings: []
    };
  } catch (error) {
    activePricing = { ...activePricing, warnings: [error instanceof Error ? error.message : String(error)] };
  }
  return activePricing;
}

function readUsdToCnyRate() {
  const configuredRate = Number(process.env.USD_TO_CNY_RATE);
  return Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : DEFAULT_USD_TO_CNY_RATE;
}

async function fetchOfficialText(url: string) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      'User-Agent': 'codex-viz/1.0'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

export function parseOfficialPricing(text: string): Record<string, ModelPricing> {
  // Restrict parsing to Standard: Batch/Flex/Fast tables repeat the same models.
  const section = text.match(/^### Standard pricing data\s*\n([\s\S]*?)(?=^### |$(?![\s\S]))/m)?.[1];
  if (!section) return {};
  const parsed: Record<string, ModelPricing> = {};
  let headers: string[] = [];
  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().split('|').slice(1, -1).map(cell => cell.trim());
    if (cells[0] === 'Model') { headers = cells; continue; }
    const model = normalizeModelName(cells[0] ?? '');
    if (!/^(gpt-|o[1-9]|codex-|davinci-|babbage-)/.test(model)) continue;
    const rates = (prefix: string): ModelPricing | undefined => {
      const price = (name: string) => {
        const cell = cells[headers.indexOf(prefix + name)];
        return cell && /^\$[\d,.]+$/.test(cell) ? Number(cell.slice(1).replace(/,/g, '')) : undefined;
      };
      const input = price('input');
      const output = price('output');
      if (input == null || output == null || !Number.isFinite(input) || !Number.isFinite(output)) return;
      return { input, cached_input: price('cached input'), cache_write: price('cache writes'), output };
    };
    const standard = rates('Short context ');
    if (standard) parsed[model] = { ...standard, long_context: rates('Long context ') };
  }
  return parsed;
}

function normalizeModelName(name: string) {
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

function pricingForModel(model: string | null) {
  if (!model) return null;
  const normalized = model.trim().toLowerCase();
  const table = activePricing.models;
  if (table[normalized]) return table[normalized];
  // Only dated snapshots can inherit a base price; never guess a new model family.
  const base = normalized.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  return table[base] ?? null;
}
