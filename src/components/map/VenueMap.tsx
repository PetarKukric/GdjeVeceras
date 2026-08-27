'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Venue } from '@/types';
import {
  MAP_TILES_URL,
  MAP_TILES_LABELS_URL,
  MAP_TILES_ATTRIBUTION,
} from './tiles';

// Lokalna divIcon ikonica — ne zavisi od CDN-a (radi i offline)
const icon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #FF006E; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #FF006E;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface VenueMapProps {
  venue: Venue;
}

export default function VenueMap({ venue }: VenueMapProps) {
  if (!venue.latitude || !venue.longitude) return null;
  
  const position: [number, number] = [venue.latitude, venue.longitude];

  return (
    <div className="w-full h-full min-h-[300px] rounded-3xl overflow-hidden border border-border/50 shadow-xl relative z-0">
      <MapContainer 
        center={position} 
        zoom={16} 
        style={{ height: '100%', width: '100%', background: '#050505' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution={MAP_TILES_ATTRIBUTION}
          url={MAP_TILES_URL}
        />
        <TileLayer
          url={MAP_TILES_LABELS_URL}
        />
        <Marker position={position} icon={icon}>
          <Popup>
            <div className="p-3 bg-card min-w-[150px]">
              <p className="font-black text-xs text-white uppercase tracking-tight mb-1">{venue.name}</p>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-tight">{venue.address}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #18181D !important;
          color: #FFFFFF !important;
          border: 1px solid #232329;
          border-radius: 1rem !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          background: #18181D !important;
          border: 1px solid #232329;
        }
      `}</style>
    </div>
  );
}
