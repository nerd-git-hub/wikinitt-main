'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { request } from 'graphql-request';
import { GET_MAP_LOCATIONS } from '@/queries/map';
import { WikiMapLocation, LocationType } from '@/data/mapData';
import MapSidebar from './MapSidebar';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import L from 'leaflet';
import { Utensils, Building2, BookUser, Home, GraduationCap } from 'lucide-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Dynamically import MapContainer and other Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function MapView() {
  const [selectedLocation, setSelectedLocation] = useState<WikiMapLocation | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['mapLocations'],
    queryFn: async () => {
      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8080/query';
      return request<{ mapLocations: any[] }>(endpoint, GET_MAP_LOCATIONS);
    },
  });

  const locations: WikiMapLocation[] = mapData?.mapLocations.map((loc: any) => ({
    ...loc,
    type: loc.type as LocationType,
    coordinates: loc.coordinates as [number, number],
  })) || [];

  const createCustomIcon = (type: string) => {
    let colorClass = 'bg-blue-600';
    let IconComponent: any = Building2;

    switch(type) {
        case 'eatery':
            colorClass = 'bg-orange-500';
            IconComponent = Utensils;
            break;
        case 'Mess':
            colorClass = 'bg-red-600';
            IconComponent = Utensils;
            break;
        case 'Hostels':
            colorClass = 'bg-indigo-600';
            IconComponent = Home;
            break;
        case 'Departments':
            colorClass = 'bg-emerald-600';
            IconComponent = GraduationCap;
            break;
        default:
            colorClass = 'bg-blue-600';
            IconComponent = Building2;
    }
    
    // We render the component to a string to use as HTML in divIcon
    // Note: This simple method creates a small React-like marker
    const iconHtml = renderToStaticMarkup(
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white ${colorClass} text-white`}>
            <IconComponent size={16} />
        </div>
    );

    return L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-icon', // Need to reset default styles or use this for sizing
      iconSize: [32, 32],
      iconAnchor: [16, 32], // Center bottom anchor points to the location
      popupAnchor: [0, -32],
    });
  };

  if (!isMounted || isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <style jsx global>{`
        .custom-leaflet-icon {
          background: transparent;
          border: none;
        }
      `}</style>
      <MapContainer
        center={[10.7589, 78.8132]}
        zoom={16}
        maxZoom={22}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={22}
        />
        
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={location.coordinates}
            icon={createCustomIcon(location.type)}
            eventHandlers={{
              click: () => setSelectedLocation(location),
            }}
          >
           {/* We can add popups if needed, but the sidebar handles the details */}
          </Marker>
        ))}
      </MapContainer>

      <MapSidebar 
        selectedLocation={selectedLocation} 
        onClose={() => setSelectedLocation(null)} 
      />
    </div>
  );
}
