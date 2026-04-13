"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export interface CourierLocation {
  id: string
  last_name: string
  first_name: string
  phone: string
  short_name: string
  is_online: boolean
  latitude: number
  longitude: number
}

export interface CourierLocationsMapProps {
  couriers: CourierLocation[]
  center: [number, number]
  zoom: number
}

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

export default function CourierLocationsMap({ couriers, center, zoom }: CourierLocationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const style = document.createElement("style")
    style.textContent = `
      .leaflet-container {
        width: 100%;
        height: 100%;
        touch-action: none;
        position: absolute !important;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .leaflet-control-zoom {
        margin-bottom: 40px !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") return

    const handleWheel = (e: WheelEvent) => {
      if (container.contains(e.target as Node)) {
        e.preventDefault()
      }
    }

    document.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      document.removeEventListener("wheel", handleWheel)
    }
  }, [])

  return (
    <div className="h-full w-full relative touch-none" ref={containerRef}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={true}
        className="h-full w-full"
        preferCanvas={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="bottomright" />

        <MapViewController center={center} zoom={zoom} />

        {couriers.map((courier) => (
          <CircleMarker
            key={courier.id}
            center={[courier.latitude, courier.longitude]}
            radius={10}
            pathOptions={{
              color: courier.is_online ? "#166534" : "#dc2626",
              fillColor: courier.is_online ? "#22c55e" : "#ef4444",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {courier.first_name} {courier.last_name}
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{courier.first_name} {courier.last_name}</p>
                <p className="text-muted-foreground">{courier.phone}</p>
                <p>
                  Статус:{" "}
                  <span className={courier.is_online ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {courier.is_online ? "Онлайн" : "Оффлайн"}
                  </span>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
