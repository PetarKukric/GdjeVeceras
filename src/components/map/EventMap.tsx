'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MAP_TILES_URL, MAP_TILES_LABELS_URL, MAP_TILES_ATTRIBUTION } from './tiles';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/types';
import { Disc3 } from 'lucide-react';
import Link from 'next/link';

const pinkIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #FF006E; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #FF006E;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const userIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div class="relative">
           <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
           <div style="background-color: #3B82F6; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px #3B82F6; position: relative; z-index: 10;"></div>
         </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface EventMapProps {
  events: Event[];
  userLocation?: { lat: number, lng: number } | null;
  /** Centar mape (koordinate izabranog grada) */
  center?: [number, number];
  /** Ključ koji se mijenja pri promjeni grada — mapa se re-centrira samo tada */
  centerKey?: string;
  zoom?: number;
}

/**
 * INTERAKTIVNA MAPA DOGAĐAJA.
 * - drag (miš + touch), scroll zoom, pinch zoom, zoom kontrole
 * - NEMA automatskog vraćanja centra nakon ručnog pomjeranja:
 *   centar se postavlja SAMO kroz centerKey (promjena grada), ne kroz
 *   efekte koji prate korisnikovu interakciju.
 */
export default function EventMap({ events, userLocation, center, centerKey = 'default', zoom = 13 }: EventMapProps) {
  // Default centar — prvi podržani grad (ako nije proslijeđen)
  const mapCenter: [number, number] = center || [45.1465, 17.2536];

  // Group events by venue location to avoid overlapping markers
  const locationGroups = events.reduce((acc, event) => {
    if (event.venue.latitude && event.venue.longitude) {
      const key = `${event.venue.latitude},${event.venue.longitude}`;
      if (!acc[key]) acc[key] = { lat: event.venue.latitude, lng: event.venue.longitude, events: [] };
      acc[key].events.push(event);
    }
    return acc;
  }, {} as Record<string, { lat: number, lng: number, events: Event[] }>);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="w-full h-full min-h-[300px] rounded-3xl overflow-hidden border border-border/50 shadow-2xl relative z-0">
      {events.length === 0 && (
        <div className="absolute inset-0 z-[400] bg-background/60 backdrop-blur-sm flex items-center justify-center p-8 text-center pointer-events-none">
          <p className="text-muted font-bold uppercase tracking-widest text-xs">Trenutno nema događaja sa dostupnom lokacijom u ovom gradu.</p>
        </div>
      )}

      {/* key=centerKey: mapa se re-mountuje SAMO pri promjeni grada (bez snap-back tokom korištenja) */}
      <MapContainer 
        key={centerKey}
        center={mapCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', background: '#050505' }}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution={MAP_TILES_ATTRIBUTION}
          url={MAP_TILES_URL}
        />
        <TileLayer
          url={MAP_TILES_LABELS_URL}
        />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="p-2 text-[10px] font-black uppercase tracking-widest text-blue-500">Ti si ovdje</div>
            </Popup>
          </Marker>
        )}

        {Object.entries(locationGroups).map(([key, group]) => (
          <Marker key={key} position={[group.lat, group.lng]} icon={pinkIcon}>
            <Popup className="event-popup">
              <div className="p-4 min-w-[240px] space-y-4 bg-card">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">{group.events[0].venue.name}</p>
                  {userLocation && (
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {calculateDistance(userLocation.lat, userLocation.lng, group.lat, group.lng)} km od tebe
                    </p>
                  )}
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {group.events.map(event => (
                    <div key={event.id} className="border-t border-border/50 pt-4 first:border-0 first:pt-0 pb-2">
                      {event.imageUrl ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden mb-3">
                           <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-16 w-full rounded-xl mb-3 bg-gradient-to-r from-primary/15 via-surface to-background border border-white/5 flex items-center justify-center gap-2">
                           <Disc3 size={18} className="text-primary" />
                           <span className="text-[9px] font-black uppercase tracking-[0.25em] text-muted">
                              {event.category === 'PARTY' ? 'Žurka' : event.category === 'CONCERT' ? 'Koncert' : 'Muzika uživo'}
                           </span>
                        </div>
                      )}
                      <h4 className="font-black text-sm text-white uppercase tracking-tight mb-2 leading-tight">{event.title}</h4>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">
                        {new Date(event.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })} • {event.price === 0 ? 'Besplatno' : `${event.price} KM`}
                      </p>
                      <Link 
                        href={`/events/${event.slug}`}
                        className="inline-flex w-full py-2.5 bg-primary text-white text-[10px] font-black justify-center rounded-xl uppercase tracking-[0.2em] hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                      >
                        DETALJI
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: #18181D !important;
          color: #FFFFFF !important;
          border: 1px solid #232329;
          border-radius: 1.5rem !important;
          padding: 0 !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: #18181D !important;
          border: 1px solid #232329;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #232329;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
