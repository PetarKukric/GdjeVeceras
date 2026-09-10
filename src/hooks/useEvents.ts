import { useState, useEffect, useCallback, useRef } from 'react';
import { EventsResponse, UseEventsProps } from '@/types';

export function useEvents({
  date = 'today',
  category = 'ALL',
  search = '',
  venue = '',
  city = '',
  minPrice,
  maxPrice,
  sort = 'startTime',
  limit = 20,
  lat,
  lng,
  reservations = '',
  initialData,
}: UseEventsProps = {}) {
  const sequence = useRef(0);
  const [data, setData] = useState<EventsResponse | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const request = ++sequence.current;
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
      if (city) params.append('city', city);
      if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
      if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());
      if (lat !== undefined && lat !== null) params.append('lat', lat.toString());
      if (lng !== undefined && lng !== null) params.append('lng', lng.toString());
      if (reservations === 'available') params.append('reservations', reservations);

      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');

      const result = await response.json();
      if (request === sequence.current) setData(result);
    } catch (err) {
      if (request === sequence.current) setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [date, category, search, venue, city, minPrice, maxPrice, sort, limit, lat, lng, reservations]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, category, search, venue, city, minPrice, maxPrice, sort, limit, lat, lng, reservations]);

  return { data, loading, error, refetch: fetchEvents };
}
