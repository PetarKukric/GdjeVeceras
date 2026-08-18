import { useState, useEffect } from 'react';
import { Venue } from '@/types';

export function useVenues(props?: { sort?: string, limit?: number, city?: string }) {
  const [data, setData] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const params = new URLSearchParams();
        if (props?.sort) params.append('sort', props.sort);
        if (props?.limit) params.append('limit', props.limit.toString());
        if (props?.city) params.append('city', props.city);

        const response = await fetch(`/api/venues?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch venues');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchVenues();
  }, [props?.sort, props?.limit, props?.city]);

  return { data, loading, error };
}
