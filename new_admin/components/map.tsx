"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

// Импортируем тип Order из columns
interface Order {
  id: string;
  order_number: string;
  from_lat?: number;
  from_lon?: number;
  order_status: {
    name: string;
    color: string;
  };
}

interface MapProps {
  orders: Order[];
  loading?: boolean;
}

export default function Map({ orders, loading = false }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
      });

      const google = await loader.load();

      if (mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 41.3111, lng: 69.2406 }, // Tashkent coordinates
          zoom: 12,
        });
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || loading) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    orders.forEach((order) => {
      if (order.from_lat && order.from_lon) {
        const marker = new google.maps.Marker({
          position: { lat: order.from_lat, lng: order.from_lon },
          map: mapInstanceRef.current,
          title: `Order #${order.order_number}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: getStatusColor(order.order_status.name),
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        markersRef.current.push(marker);
      }
    });
  }, [orders, loading]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[600px] rounded-lg border bg-background"
    />
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "#fbbf24"; // yellow
    case "processing":
      return "#3b82f6"; // blue
    case "completed":
      return "#22c55e"; // green
    case "cancelled":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
} 