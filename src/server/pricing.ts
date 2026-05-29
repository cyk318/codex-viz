import type { CodexTokenUsage } from '../lib/types';

export type ModelPricing = {
  input: number;
  output: number;
  cached_input?: number;
};

export type PricingSnapshot = {
  source: 'built-in' | 'official';
  updatedAt: string | null;
  models: Record<string, ModelPricing>;
  warnings: string[];
};

const BUILT_IN_PRICING: Record<string, ModelPricing> = {
  'gpt-5.5': { input: 5, cached_input: 0.5, output: 30 },
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
  warnings: []
};

export function calcCost(model: string | null, usage: CodexTokenUsage): number | null {
  const pricing = pricingForModel(model);
  if (!pricing) return null;
  const cachedTokens = usage.cached_input_tokens ?? 0;
  const uncachedInputTokens = Math.max(0, (usage.input_tokens ?? 0) - cachedTokens);
  const input = (uncachedInputTokens / 1_000_000) * pricing.input;
  const cached = (cachedTokens / 1_000_000) * (pricing.cached_input ?? pricing.input);
  const output = ((usage.output_tokens ?? 0) / 1_000_000) * pricing.output;
  return input + cached + output;
}

export function getPricingSnapshot() {
  return activePricing;
}

export async function refreshPricingFromOfficial(): Promise<PricingSnapshot> {
  const warnings: string[] = [];
  const pages = await Promise.allSettled([
    fetchOfficialText('https://platform.openai.com/docs/pricing.md')
  ]);
  const texts = pages.flatMap((result) => {
    if (result.status === 'fulfilled') return [result.value];
    warnings.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    return [];
  });

  const parsed = parseOfficialPricing(texts.join('\n'));
  const models = { ...BUILT_IN_PRICING, ...parsed };
  if (!Object.keys(parsed).length) warnings.push('No model pricing rows were parsed from official pages; kept built-in pricing.');

  activePricing = {
    source: Object.keys(parsed).length ? 'official' : 'built-in',
    updatedAt: new Date().toISOString(),
    models,
    warnings
  };
  return activePricing;
}

async function fetchOfficialText(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'codex-viz/1.0'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return htmlToText(await res.text());
}

function parseOfficialPricing(text: string): Record<string, ModelPricing> {
  const parsed: Record<string, ModelPricing> = {};
  const rowRegex = /\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*,\s*(null|"-"|""|[0-9.]+)\s*,\s*([0-9.]+)\s*\]/g;
  for (const match of text.matchAll(rowRegex)) {
    const model = normalizeModelName(match[1]);
    const input = Number(match[2]);
    const cached = match[3] === 'null' || match[3] === '"-"' || match[3] === '""' ? undefined : Number(match[3]);
    const output = Number(match[4]);
    if (model && Number.isFinite(input) && Number.isFinite(output)) {
      parsed[model] = { input, cached_input: Number.isFinite(cached) ? cached : undefined, output };
    }
  }
  return parsed;
}

function normalizeModelName(name: string) {
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function pricingForModel(model: string | null) {
  if (!model) return null;
  const normalized = model.toLowerCase();
  const table = activePricing.models;
  if (table[normalized]) return table[normalized];
  if (normalized.startsWith('gpt-5.5')) return table['gpt-5.5'];
  if (normalized.startsWith('gpt-5.2-codex')) return table['gpt-5.2-codex'];
  if (normalized.startsWith('gpt-5.1-codex-max')) return table['gpt-5.1-codex-max'];
  if (normalized.startsWith('gpt-5.1-codex')) return table['gpt-5.1-codex'];
  if (normalized.startsWith('gpt-5-codex')) return table['gpt-5-codex'];
  if (normalized.startsWith('gpt-5.2')) return table['gpt-5.2'];
  if (normalized.startsWith('gpt-5.1')) return table['gpt-5.1'];
  if (normalized.startsWith('gpt-5-mini')) return table['gpt-5-mini'];
  if (normalized.startsWith('gpt-5-nano')) return table['gpt-5-nano'];
  if (normalized.startsWith('gpt-5')) return table['gpt-5'];
  return null;
}
