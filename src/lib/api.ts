import type { PricingSnapshot, ProjectSummary, SearchResult, SessionCleanupResult, SessionDetail, SessionSummary } from './types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  projects: () => getJson<ProjectSummary[]>('/api/projects'),
  sessions: () => getJson<SessionSummary[]>('/api/sessions'),
  session: (id: string) => getJson<SessionDetail>(`/api/sessions/${encodeURIComponent(id)}`),
  deleteSession: (id: string) => fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status} ${res.statusText}`);
    }
    return res.json();
  }),
  cleanupSessions: () => fetch('/api/sessions/cleanup', { method: 'DELETE' }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<SessionCleanupResult>;
  }),
  raw: (id: string) => fetch(`/api/sessions/${encodeURIComponent(id)}/raw`).then((res) => res.text()),
  search: (q: string) => getJson<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  pricing: () => getJson<PricingSnapshot>('/api/pricing'),
  refreshPricing: () => fetch('/api/pricing/refresh', { method: 'POST' }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<PricingSnapshot>;
  })
};
