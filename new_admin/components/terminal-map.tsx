"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "../lib/utils";

interface TerminalMapProps {
  latitude: number;
  longitude: number;
  name: string;
  className?: string;
}

export function TerminalMap({ latitude, longitude, name, className }: TerminalMapProps) {
  // Исправляем проблему с иконками маркеров в Leaflet при использовании с Next.js
  useEffect(() => {
    // Это решение проблемы с маркерами в React Leaflet
    // @ts-ignore - _getIconUrl существует, но не типизирован корректно
    delete L.Icon.Default.prototype._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  if (!latitude || !longitude) {
    return (
      <div className={cn("h-[300px] rounded-md bg-muted flex items-center justify-center", className)}>
        <p className="text-muted-foreground">Координаты не указаны</p>
      </div>
    );
  }

  return (
    <div className={cn("h-[300px] rounded-md overflow-hidden", className)}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

// Добавляем экспорт по умолчанию для динамического импорта
export default TerminalMap; 