"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { toast } from "sonner"
import "leaflet.heat" // Import the leaflet.heat plugin

// Use dynamic import for leaflet-heat
let HeatmapLayer: any = null;

export interface HeatPoint {
  lat: number
  lon: number
  intensity: number
}

export interface TerminalMarker {
  id: string
  name: string
  lat: number
  lon: number
}

export interface HeatMapComponentProps {
  heatMapData: HeatPoint[]
  terminalMarkers: TerminalMarker[]
}

// Add typings for L.heatLayer which is added by the leaflet.heat plugin
declare module "leaflet" {
  function heatLayer(latlngs: Array<[number, number, number]>, options?: any): L.Layer
}

// Component to handle rendering the heat map layer
function HeatmapLayerComponent({ points }: { points: HeatPoint[] }) {
  const map = useMap()
  const heatLayerRef = useRef<L.Layer | null>(null)
  
  // Create or update the heat layer when points change
  useEffect(() => {
    // Remove previous heat layer if exists
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
    }
    
    if (points.length === 0) return
    
    // Format points for the heat layer
    const heatPoints = points.map(point => [
      point.lat,
      point.lon,
      point.intensity
    ] as [number, number, number])
    
    try {
      // Create heat layer with configuration
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }).addTo(map)
      
      // Set bounds to fit all heat points
      const bounds = L.latLngBounds(points.map(point => [point.lat, point.lon]))
      map.fitBounds(bounds, { padding: [50, 50] })
    } catch (error) {
      console.error("Error creating heat layer:", error)
      toast.error("Ошибка при создании тепловой карты")
    }
    
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [map, points])
  
  return null
}

// Component to handle map bounds based on markers
function MapBoundsHandler({ markers }: { markers: TerminalMarker[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (markers.length === 0) return
    
    // Create a bounds object from all the markers
    const bounds = L.latLngBounds(
      markers.map(marker => [marker.lat, marker.lon])
    )
    
    // Fit the map to the bounds with some padding
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [map, markers])
  
  return null
}

export default function HeatMapComponent({ heatMapData, terminalMarkers }: HeatMapComponentProps) {
  // Initialize with a default center (use first terminal or default coordinates)
  const defaultCenter: [number, number] = terminalMarkers.length > 0 
    ? [terminalMarkers[0].lat, terminalMarkers[0].lon]
    : [41.311151, 69.279737]
  
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Fix Leaflet icon issues in Next.js
  useEffect(() => {
    // Only fix in client side
    if (typeof window === "undefined") return
    
    // Fix the Leaflet default icon issue
    const iconDefault = L.Icon.Default as any
    if (iconDefault.prototype._getIconUrl) {
      delete iconDefault.prototype._getIconUrl
    }
    
    // Configure default icons
    L.Icon.Default.mergeOptions({
      iconUrl: '/leaflet/marker-icon.png',
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    })
    
    // Prevent page scrolling when using the mouse wheel on the map
    const container = containerRef.current
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (container.contains(e.target as Node)) {
          e.preventDefault()
        }
      }
      
      document.addEventListener('wheel', handleWheel, { passive: false })
      
      return () => {
        document.removeEventListener('wheel', handleWheel)
      }
    }
  }, [])
  
  // Add CSS for Leaflet
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") return
    
    const style = document.createElement('style')
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
      .leaflet-popup-content-wrapper {
        max-width: 300px;
      }
      .leaflet-touch .leaflet-control-zoom-in,
      .leaflet-touch .leaflet-control-zoom-out {
        font-size: 18px !important;
        height: 34px !important;
        width: 34px !important;
        line-height: 30px !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  
  return (
    <div className="h-full w-full relative touch-none" ref={containerRef}>
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
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
        
        {/* Terminal markers */}
        {terminalMarkers.map((terminal) => (
          <Marker
            key={terminal.id}
            position={[terminal.lat, terminal.lon]}
          >
            <Popup>
              <div>
                <strong>{terminal.name}</strong>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Heat map layer */}
        <HeatmapLayerComponent points={heatMapData} />
        
        {/* Set map bounds based on terminals */}
        {terminalMarkers.length > 0 && (
          <MapBoundsHandler markers={terminalMarkers} />
        )}
      </MapContainer>
    </div>
  )
} 