"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Define the interface for an order
export interface Order {
  id: string
  order_number: string
  to_lat: number
  to_lon: number
  address?: string
  courier_id?: string | null
}

// Define the props for the MapComponent
export interface MapComponentProps {
  orders: Order[]
  getMarkerColor: (order: Order) => string
  onMarkerClick: (order: Order) => void
}

// Component to handle map bounds - только при первой загрузке или изменении списка заказов
function MapBoundsHandler({ orders }: { orders: Order[] }) {
  const map = useMap()
  const [hasSetBounds, setHasSetBounds] = useState(false)
  
  // Set bounds only on initial render or when orders change substantially
  useEffect(() => {
    // Не устанавливаем границы, если уже установили ранее и список не пустой
    if (hasSetBounds && orders.length > 0) return
    
    if (orders.length === 0) return
    
    // Create a bounds object from all the order coordinates
    const bounds = L.latLngBounds(
      orders.map(order => [order.to_lat, order.to_lon])
    )
    
    // Fit the map to the bounds with some padding
    map.fitBounds(bounds, { padding: [50, 50] })
    setHasSetBounds(true)
  }, [map, orders, hasSetBounds])
  
  // Сбрасываем флаг, если список заказов существенно изменился
  useEffect(() => {
    // Reset bounds flag if orders list changes drastically
    setHasSetBounds(false)
  }, [orders.length])
  
  return null
}

export default function MapComponent({ orders, getMarkerColor, onMarkerClick }: MapComponentProps) {
  // Initialize with a default center
  const defaultCenter: [number, number] = [41.311151, 69.279737]
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
  
  // Add touch events handler for mobile devices
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") return
    
    // Add css style to fix map height issues
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
  
  // Prevent zoom control events from propagating to parent elements
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") return
    
    // Добавляем обработчики событий для кнопок зума
    const handleZoomEvent = (e: Event) => {
      e.stopPropagation()
    }
    
    // Нужно дождаться, когда кнопки зума будут добавлены в DOM
    setTimeout(() => {
      const zoomIn = container.querySelector('.leaflet-control-zoom-in')
      const zoomOut = container.querySelector('.leaflet-control-zoom-out')
      
      if (zoomIn) {
        zoomIn.addEventListener('click', handleZoomEvent)
        zoomIn.addEventListener('touchstart', handleZoomEvent)
      }
      
      if (zoomOut) {
        zoomOut.addEventListener('click', handleZoomEvent)
        zoomOut.addEventListener('touchstart', handleZoomEvent)
      }
    }, 1000)
    
    return () => {
      const zoomIn = container.querySelector('.leaflet-control-zoom-in')
      const zoomOut = container.querySelector('.leaflet-control-zoom-out')
      
      if (zoomIn) {
        zoomIn.removeEventListener('click', handleZoomEvent)
        zoomIn.removeEventListener('touchstart', handleZoomEvent)
      }
      
      if (zoomOut) {
        zoomOut.removeEventListener('click', handleZoomEvent)
        zoomOut.removeEventListener('touchstart', handleZoomEvent)
      }
    }
  }, [])
  
  // Create custom marker icons for different colors
  const createMarkerIcon = (color: string) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }
  
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
        
        {orders.map((order) => (
          <Marker
            key={order.id}
            position={[order.to_lat, order.to_lon]}
            icon={createMarkerIcon(getMarkerColor(order))}
            eventHandlers={{
              click: () => onMarkerClick(order),
            }}
          >
            <Popup>
              <div>
                <strong>Заказ: {order.order_number}</strong>
                {order.address && <p>{order.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {orders.length > 0 && <MapBoundsHandler orders={orders} />}
      </MapContainer>
    </div>
  )
} 