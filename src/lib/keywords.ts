import type { SessionDetail, SessionSummary } from './types';

export type KeywordItem = {
  text: string;
  count: number;
  weight: number;
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'your', 'you',
  '这里', '这个', '一下', '一个', '现在', '然后', '可以', '需要', '进行', '是不是',
  '帮我', '看看', '给我', '一下', '项目', '里面', '这边', '那个', '这些', '怎么',
  '什么', '为什么', '不要', '已经', '还是', '以及', '或者', '如果', '因为',
  '一下', '一下子', '这个是', '这里的', '这次', '这个功能', '当前', '相关',
  'session', 'sessions', 'codex', 'src', 'main', 'test', 'component', 'components',
  'views', 'service', 'domain', 'application', 'query', 'command', 'impl'
]);

export function keywordsFromSummaries(sessions: SessionSummary[], limit = 36): KeywordItem[] {
  return rankKeywords(sessions.map((session) => session.title).join('\n'), limit);
}

export function keywordsFromSession(detail: SessionDetail, limit = 36): KeywordItem[] {
  return rankKeywords(
    detail.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.text)
      .join('\n'),
    limit
  );
}

function rankKeywords(text: string, limit: number): KeywordItem[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .filter(([word, count]) => count >= minCount(word))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([text, count]) => ({
    text,
    count,
    weight: count / max
  }));
}

function tokenize(text: string) {
  const words: string[] = [];
  const normalized = text.toLowerCase();
  const cleaned = normalized
    .replace(/[~./\\][^\s，。；：、]+/g, ' ')
    .replace(/[a-z0-9_-]+\.(ts|tsx|js|jsx|vue|java|kt|kts|md|json|xml|proto|sql|css|scss|html)\b/g, ' ')
    .replace(/\b[a-z][a-z0-9_]*[A-Z][a-zA-Z0-9_]*\b/g, ' ');
  for (const match of cleaned.matchAll(/[a-z][a-z0-9_-]{2,}|[\u4e00-\u9fa5]{2,}/g)) {
    const raw = match[0].trim();
    if (raw.length > 20) continue;
    if (STOP_WORDS.has(raw)) continue;
    if (/^\d+$/.test(raw)) continue;
    if (/^\d{4,}/.test(raw)) continue;
    if (/^(ds-start|ds-run|ds-done)$/.test(raw)) continue;
    words.push(raw);
  }
  return words;
}

function minCount(word: string) {
  if (/[\u4e00-\u9fa5]/.test(word)) return 2;
  return word.length <= 4 ? 3 : 2;
}
