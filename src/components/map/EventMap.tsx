'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/types';
import Link from 'next/link';

const pinkIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #FF0080; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #FF0080;"></div>`,
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

// Component to handle map view updates
function MapUpdater({ center, zoom }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface EventMapProps {
  events: Event[];
  userLocation?: { lat: number, lng: number } | null;
}

export default function EventMap({ events, userLocation }: EventMapProps) {
  // Default map center
  const defaultCenter: [number, number] = [45.1465, 17.2536];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  // Group events by venue location to avoid overlapping
  const locationGroups = events.reduce((acc, event) => {
    if (event.venue.latitude && event.venue.longitude) {
      const key = `${event.venue.latitude},${event.venue.longitude}`;
      if (!acc[key]) acc[key] = { lat: event.venue.latitude, lng: event.venue.longitude, events: [] };
      acc[key].events.push(event);
    }
    return acc;
  }, {} as Record<string, { lat: number, lng: number, events: Event[] }>);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation]);

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
    <div className="w-full h-full min-h-[500px] rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl relative z-0">
      {events.length === 0 && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center p-8 text-center">
          <p className="text-muted font-bold uppercase tracking-widest text-xs">Trenutno nema događaja sa dostupnom lokacijom.</p>
        </div>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%', background: '#020106' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={mapCenter} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="p-2 text-[10px] font-black uppercase tracking-widest text-blue-500">📍 Ti si ovdje</div>
            </Popup>
          </Marker>
        )}

        {Object.entries(locationGroups).map(([key, group]) => (
          <Marker key={key} position={[group.lat, group.lng]} icon={pinkIcon}>
            <Popup className="event-popup">
              <div className="p-4 min-w-[240px] space-y-4 bg-card">
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">{group.events[0].venue.name}</p>
                  {userLocation && (
                    <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                      {calculateDistance(userLocation.lat, userLocation.lng, group.lat, group.lng)} km od tebe
                    </p>
                  )}
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {group.events.map(event => (
                    <div key={event.id} className="border-t border-border/50 pt-4 first:border-0 first:pt-0 pb-2">
                      {event.imageUrl && (
                        <div className="aspect-video w-full rounded-xl overflow-hidden mb-3">
                           <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="font-black text-sm text-white uppercase tracking-tight mb-2 leading-tight">{event.title}</h4>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-widest mb-3">
                        {new Date(event.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })} • {event.price === 0 ? 'Besplatno' : `${event.price} KM`}
                      </p>
                      <Link 
                        href={`/events/${event.slug}`}
                        className="inline-flex w-full py-2.5 bg-primary text-white text-[9px] font-black justify-center rounded-xl uppercase tracking-[0.2em] hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                      >
                        POGLEDAJ DOGAĐAJ
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
          background: #0F0E17 !important;
          color: #FFFFFF !important;
          border: 1px solid #1E1E2E;
          border-radius: 1.5rem !important;
          padding: 0 !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: #0F0E17 !important;
          border: 1px solid #1E1E2E;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1E1E2E;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
