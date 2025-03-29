"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "../lib/utils";

// Динамический импорт компонента карты для клиентской загрузки
const TerminalMapComponent = dynamic(
  () => import("./terminal-map").then((mod) => mod.TerminalMap),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[300px] rounded-md bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка карты...</p>
      </div>
    ),
  }
);

interface DynamicMapProps {
  latitude: number;
  longitude: number;
  name: string;
  className?: string;
}

export function DynamicMap({ latitude, longitude, name, className }: DynamicMapProps) {
  const [mounted, setMounted] = useState(false);

  // Проверяем, что компонент отрендерен на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-[300px] rounded-md bg-muted flex items-center justify-center", className)}>
        <p className="text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <TerminalMapComponent
      latitude={latitude}
      longitude={longitude}
      name={name}
      className={className}
    />
  );
} 