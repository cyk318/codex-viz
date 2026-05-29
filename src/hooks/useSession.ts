import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SessionDetail } from '../lib/types';

export function useSession(id: string | undefined) {
  const [data, setData] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.session(id)
      .then((session) => {
        if (!cancelled) setData(session);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, error, loading };
}
