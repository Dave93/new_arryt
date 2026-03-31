"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Define props interface for the OrderMap component
interface OrderMapProps {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  locations: Array<{ lat: number; lon: number; color?: string }>;
  isLoading?: boolean;
}

// Custom hook to fit map bounds
function ChangeView({ bounds }: { bounds: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      // Convert array of points to LatLngBounds object
      const latLngBounds = L.latLngBounds(bounds);
      // Add padding to ensure markers aren't right at the edge
      map.fitBounds(latLngBounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

const createLabelIcon = (label: string, color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const iconA = createLabelIcon("A", "#22c55e");
const iconB = createLabelIcon("Б", "#ef4444");

export default function OrderMap({ 
  origin,
  destination,
  locations,
  isLoading = false,
}: OrderMapProps) {
  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Map coordinates missing.</p>
      </div>
    );
  }

  const originPosition: LatLngExpression = [origin.lat, origin.lon];
  const destinationPosition: LatLngExpression = [destination.lat, destination.lon];
  const pathPositions: LatLngExpression[] = locations.map(loc => [loc.lat, loc.lon]);

  // Combine all points to calculate bounds
  const bounds: LatLngExpression[] = [originPosition, destinationPosition, ...pathPositions];

  return (
    <MapContainer 
      center={originPosition} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <Marker position={originPosition} icon={iconA}>
        <Popup>Филиал</Popup>
      </Marker>

      <Marker position={destinationPosition} icon={iconB}>
        <Popup>Адрес доставки</Popup>
      </Marker>

      {/* Polyline for the path - more visible blue line */}
      {pathPositions.length > 0 && (
        <Polyline
          positions={pathPositions}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
        />
      )}

      {/* Component to adjust map view */}
      <ChangeView bounds={bounds} />
    </MapContainer>
  );
} 