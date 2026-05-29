import type { SessionSummary } from './types';
import { sumTokens } from './format';

export type DailyUsage = {
  date: string;
  label: string;
  tokens: number;
  cost: number;
  sessions: number;
};

export function todayUsage(sessions: SessionSummary[]) {
  const today = localDateKey(new Date());
  return summarizeSessions(sessions.filter((session) => localDateKey(new Date(session.startedAt)) === today));
}

export function lastThirtyDaysUsage(sessions: SessionSummary[]): DailyUsage[] {
  const today = startOfLocalDay(new Date());
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    return {
      date: localDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit' }).format(date),
      tokens: 0,
      cost: 0,
      sessions: 0
    };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));

  for (const session of sessions) {
    const key = localDateKey(new Date(session.startedAt));
    const day = byDate.get(key);
    if (!day) continue;
    day.tokens += sumTokens(session.totalTokens);
    day.cost += session.estimatedCostUsd ?? 0;
    day.sessions += 1;
  }

  return days;
}

export function summarizeSessions(sessions: SessionSummary[]) {
  return sessions.reduce(
    (acc, session) => {
      acc.tokens += sumTokens(session.totalTokens);
      acc.cost += session.estimatedCostUsd ?? 0;
      acc.sessions += 1;
      return acc;
    },
    { tokens: 0, cost: 0, sessions: 0 }
  );
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
