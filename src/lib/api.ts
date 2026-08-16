import { EventDetailsResponse, Venue } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getEventBySlug(slug: string): Promise<EventDetailsResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/events/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    const res = await fetch(`${API_URL}/api/venues/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching venue:', error);
    return null;
  }
}
