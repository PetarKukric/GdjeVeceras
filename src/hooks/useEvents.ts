import { useState, useEffect, useCallback } from 'react';
import { EventsResponse, UseEventsProps } from '@/types';

export function useEvents({ 
  date = 'today', 
  category = 'ALL', 
  search = '', 
  venue = '',
  minPrice,
  maxPrice,
  sort = 'startTime',
  limit = 20,
  lat,
  lng
}: UseEventsProps = {}) {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date,
        limit: limit.toString(),
        sort,
      });
      if (category && category !== 'ALL') params.append('category', category);
      if (search) params.append('search', search);
      if (venue) params.append('venue', venue);
      if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
      if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());
      if (lat !== undefined && lat !== null) params.append('lat', lat.toString());
      if (lng !== undefined && lng !== null) params.append('lng', lng.toString());

      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [date, category, search, venue, minPrice, maxPrice, sort, limit, lat, lng]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, category, search, venue, minPrice, maxPrice, sort, lat, lng]);

  return { data, loading, error, refetch: fetchEvents };
}
