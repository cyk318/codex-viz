import type { CodexRateLimits, CodexTokenUsage } from './types';

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat().format(value ?? 0);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function formatUsd(value: number | null | undefined) {
  if (value == null) return '费用未知';
  if (value > 0 && value < 0.01) return '<$0.01';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function sumTokens(usage: CodexTokenUsage | null | undefined) {
  return usage?.total_tokens
    ?? ((usage?.input_tokens ?? 0)
      + (usage?.output_tokens ?? 0)
      + (usage?.reasoning_output_tokens ?? 0));
}

export function shortPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 3) return path;
  return `.../${parts.slice(-3).join('/')}`;
}

export function excerpt(value: string, max = 160) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
}

export function formatDuration(ms: number | null) {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatRateLimitLabel(rateLimits: CodexRateLimits | null | undefined) {
  if (!rateLimits) return '-';
  const primary = remainingPercent(rateLimits.primary?.used_percent);
  const secondary = remainingPercent(rateLimits.secondary?.used_percent);
  const parts = [];
  if (primary != null) parts.push(`5h 剩余 ${primary}%`);
  if (secondary != null) parts.push(`Weekly 剩余 ${secondary}%`);
  return parts.length ? parts.join(' · ') : '-';
}

function remainingPercent(used: number | undefined) {
  if (typeof used !== 'number' || !Number.isFinite(used)) return null;
  return Math.max(0, Math.round(100 - used));
}
