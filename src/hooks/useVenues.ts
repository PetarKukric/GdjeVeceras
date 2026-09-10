import { useState, useEffect } from 'react';
import { Venue } from '@/types';

export function useVenues(props?: { sort?: string, limit?: number, city?: string, type?: string }) {
  const [data, setData] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    async function fetchVenues() {
      try {
        const params = new URLSearchParams();
        if (props?.sort) params.append('sort', props.sort);
        if (props?.limit) params.append('limit', props.limit.toString());
        if (props?.city) params.append('city', props.city);
        if (props?.type) params.append('type', props.type);

        const response = await fetch(`/api/venues?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch venues');
        const result = await response.json();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVenues();
    return () => { cancelled = true; };
  }, [props?.sort, props?.limit, props?.city, props?.type]);

  return { data, loading, error };
}
