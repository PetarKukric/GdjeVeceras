export type Category = 'LIVE_MUSIC' | 'PARTY';
export type Status = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type DressCodeType = 'CASUAL' | 'ELEGANT' | 'SPECIAL' | 'NONE';

export interface OpeningHour {
  id: string;
  venueId: string;
  dayGroup: 'WEEKDAYS' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface VenueTag {
  id: string;
  name: string;
  venueId: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  reservationsEnabled?: boolean;
  description?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  imageUrl?: string;
  ownerId?: string | null;
  openingHours?: OpeningHour[];
  tags?: VenueTag[];
  _count?: {
    events: number;
    comments: number;
    favorites: number;
  };
  events?: Event[];
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string;
  venueId: string;
  venue: Venue;
  additionalVenues?: {
    id: string;
    venue: {
      id: string;
      name: string;
      city?: string | null;
      slug: string;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      imageUrl?: string | null;
    };
  }[];
  startDateTime: string;
  endDateTime: string;
  price?: number;
  currency: string;
  category: Category;
  performers?: string;
  imageUrl?: string;
  ticketUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  minimumAge?: number;
  dressCodeType: DressCodeType;
  dressCodeName?: string;
  dressCodeDescription?: string;
  status: Status;
  distance?: number | null;
  recommendationReason?: string;
  _count?: {
    favorites: number;
    comments: number;
    liveMedia?: number;
  };
}

export interface UseEventsProps {
  date?: string;
  category?: Category | 'ALL';
  search?: string;
  venue?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
  lat?: number;
  lng?: number;
}

export interface EventDetailsResponse {
  event: Event;
  related: {
    venueEvents: Event[];
    similarEvents: Event[];
  };
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
