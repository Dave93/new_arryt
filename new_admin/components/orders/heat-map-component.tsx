"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { toast } from "sonner"
import "leaflet.heat" // Import the leaflet.heat plugin
import "leaflet.markercluster/dist/leaflet.markercluster.js"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import { LayoutGrid } from "lucide-react"

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
  originalLat?: number
  originalLon?: number
  organizationIconUrl?: string
  organizationName?: string
}

export interface OrderMarker {
  lat: number
  lon: number
  count: number
  orderId?: string
  address?: string
  status?: string
  terminalId?: string
}

export interface HeatMapComponentProps {
  heatMapData: HeatPoint[]
  terminalMarkers: TerminalMarker[]
  orderMarkers?: OrderMarker[]
  showOrderClusters?: boolean
  selectedTerminalIds?: string[]
  onTerminalSelect?: (terminalIds: string[]) => void
  onCheckDeliveryRadius?: (lat: number, lon: number) => void
  deliveryRadiusPoint?: { lat: number, lon: number } | null
  deliveryRadius?: number
  showDeliveryRadius?: boolean
}

// Add typings for L.heatLayer which is added by the leaflet.heat plugin
declare module "leaflet" {
  function heatLayer(latlngs: Array<[number, number, number]>, options?: any): L.Layer
  
  namespace MarkerClusterGroup {
    interface MarkerClusterGroupOptions {
      showCoverageOnHover?: boolean
      zoomToBoundsOnClick?: boolean
      spiderfyOnMaxZoom?: boolean
      removeOutsideVisibleBounds?: boolean
      animate?: boolean
      maxClusterRadius?: number
      disableClusteringAtZoom?: number
      chunkedLoading?: boolean
      chunkInterval?: number
      chunkDelay?: number
    }
  }

  class MarkerClusterGroup extends FeatureGroup {
    constructor(options?: MarkerClusterGroup.MarkerClusterGroupOptions)
    addLayer(layer: Layer): this
    addLayers(layers: Layer[]): this
    // Добавляем кастомное свойство для кластеров
    _iconCreateFunction?: any
  }

  // Extend Marker to allow custom data
  interface Marker {
    terminalId?: string
  }
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
      // Create heat layer with configuration - increased radius and intensity
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 35, // Increased from 30
        blur: 20,   
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'red' } // Adjusted gradient for more intensity
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

// Function to offset overlapping terminal markers
function offsetOverlappingMarkers(markers: TerminalMarker[]): TerminalMarker[] {
  const locationMap = new Map<string, TerminalMarker[]>();
  
  // Group markers by location
  markers.forEach(marker => {
    const key = `${marker.lat.toFixed(6)},${marker.lon.toFixed(6)}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, []);
    }
    locationMap.get(key)!.push(marker);
  });
  
  // Create new array with offset markers
  const offsetMarkers: TerminalMarker[] = [];
  
  locationMap.forEach((markersAtLocation, key) => {
    if (markersAtLocation.length === 1) {
      // Single marker at this location, no offset needed
      offsetMarkers.push(markersAtLocation[0]);
    } else {
      // Multiple markers at same location, apply offset in a circle pattern
      const radius = 0.00005; // ~30 meters offset, adjust as needed
      markersAtLocation.forEach((marker, index) => {
        const angle = (2 * Math.PI * index) / markersAtLocation.length;
        const offsetLat = marker.lat + radius * Math.cos(angle);
        const offsetLon = marker.lon + radius * Math.sin(angle);
        
        offsetMarkers.push({
          ...marker,
          lat: offsetLat,
          lon: offsetLon,
          // Store original coordinates in the marker for use in popups
          originalLat: marker.lat,
          originalLon: marker.lon,
        });
      });
    }
  });
  
  return offsetMarkers;
}

// Component for order markers with clustering
function OrderMarkersComponent({ 
  markers, 
  show, 
  highlightedTerminalIds 
}: { 
  markers: OrderMarker[], 
  show: boolean,
  highlightedTerminalIds: string[]
}) {
  const map = useMap()
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersWithTerminals = useRef<Map<string, string | undefined>>(new Map())
  
  useEffect(() => {
    // Remove previous clusters if they exist
    if (markerClusterRef.current) {
      map.removeLayer(markerClusterRef.current)
      markerClusterRef.current = null
    }
    
    markersWithTerminals.current.clear()
    
    if (!show || markers.length === 0) return
    
    try {
      // Initialize a new marker cluster group
      const mcg = new L.MarkerClusterGroup({
        showCoverageOnHover: false,
        disableClusteringAtZoom: 18,
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true
      })
      
      // Create custom icon for order markers
      const orderIcon = new L.Icon({
        iconUrl: '/leaflet/marker-icon-violet.png',
        iconRetinaUrl: '/leaflet/marker-icon-violet-2x.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      
      // Filter markers by terminal if terminals are highlighted
      const filteredMarkers = highlightedTerminalIds.length > 0
        ? markers.filter(marker => marker.terminalId && highlightedTerminalIds.includes(marker.terminalId))
        : markers;
      
      // Add markers to the cluster group
      filteredMarkers.forEach(marker => {
        // Store the terminal ID with the marker key
        const markerId = `${marker.lat},${marker.lon}`
        markersWithTerminals.current.set(markerId, marker.terminalId)
        
        const leafletMarker = L.marker([marker.lat, marker.lon], { 
          icon: orderIcon
        }).bindPopup(`
          <div class="p-1">
            <div class="font-bold">${marker.address || 'Адрес неизвестен'}</div>
            <div>Количество заказов: ${marker.count}</div>
            ${marker.status ? `<div>Статус: ${marker.status}</div>` : ''}
            ${marker.orderId ? `<div>ID заказа: ${marker.orderId}</div>` : ''}
            ${marker.terminalId ? `<div>ID филиала: ${marker.terminalId}</div>` : ''}
          </div>
        `)
        
        mcg.addLayer(leafletMarker)
      })
      
      // Add the cluster group to the map
      map.addLayer(mcg)
      markerClusterRef.current = mcg
    } catch (error) {
      console.error("Error creating marker clusters:", error)
      toast.error("Ошибка при создании кластеров заказов")
    }
    
    return () => {
      if (markerClusterRef.current) {
        map.removeLayer(markerClusterRef.current)
      }
      markersWithTerminals.current.clear()
    }
  }, [map, markers, show, highlightedTerminalIds])
  
  return null
}

// Component to handle map bounds based on markers
function MapBoundsHandler({ 
  markers,
  orderMarkers,
  showOrderMarkersOnly
}: { 
  markers: TerminalMarker[],
  orderMarkers?: OrderMarker[],
  showOrderMarkersOnly?: boolean
}) {
  const map = useMap()
  
  useEffect(() => {
    if ((markers.length === 0 && (!orderMarkers || orderMarkers.length === 0))) return
    
    // If we have order markers and should prioritize them, use their bounds
    if (showOrderMarkersOnly && orderMarkers && orderMarkers.length > 0) {
      // Create a bounds object from all the order markers
      const bounds = L.latLngBounds(
        orderMarkers.map(marker => [marker.lat, marker.lon])
      )
      
      // Fit the map to the bounds with some padding
      map.fitBounds(bounds, { padding: [50, 50] })
      return
    }
    
    // Otherwise use terminal markers bounds
    // Create a bounds object from all the markers
    const bounds = L.latLngBounds(
      markers.map(marker => [marker.lat, marker.lon])
    )
    
    // Fit the map to the bounds with some padding
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [map, markers, orderMarkers, showOrderMarkersOnly])
  
  return null
}

// Component to display the delivery radius circle
function DeliveryRadiusCircle({ 
  center, 
  radius 
}: { 
  center: [number, number], 
  radius: number 
}) {
  const map = useMap();
  const circleRef = useRef<L.Circle | null>(null);
  const previousViewRef = useRef<{center: L.LatLng, zoom: number} | null>(null);
  
  // Store the current view before adding the circle
  useEffect(() => {
    // Save the current map view
    previousViewRef.current = {
      center: map.getCenter(),
      zoom: map.getZoom()
    };
    
    return () => {
      // When unmounting, we'll let the MapBoundsController handle the view reset
    };
  }, []);
  
  useEffect(() => {
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
    }
    
    // Create a circle with the given center and radius
    circleRef.current = L.circle(center, {
      radius: radius * 1000, // Convert km to meters
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '5, 5', // Dashed circle
    }).addTo(map);
    
    // Fit map to show the circle
    map.setView(center, map.getBoundsZoom(circleRef.current.getBounds(), false));
    
    return () => {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    };
  }, [map, center, radius]);
  
  return null;
}

export default function HeatMapComponent({ 
  heatMapData, 
  terminalMarkers,
  orderMarkers = [],
  showOrderClusters = false,
  selectedTerminalIds = [],
  onTerminalSelect,
  onCheckDeliveryRadius,
  deliveryRadiusPoint = null,
  deliveryRadius = 3,
  showDeliveryRadius = false
}: HeatMapComponentProps) {
  const [highlightedTerminalIds, setHighlightedTerminalIds] = useState<string[]>([])
  const [previousDeliveryRadiusState, setPreviousDeliveryRadiusState] = useState<boolean>(false)
  
  // Apply offset to overlapping terminal markers
  const offsetTerminalMarkers = useMemo(() => {
    return offsetOverlappingMarkers(terminalMarkers);
  }, [terminalMarkers]);
  
  // Track when delivery radius panel is closed to trigger bounds update
  useEffect(() => {
    // When delivery radius is closed, we want to update bounds to order markers
    if (previousDeliveryRadiusState && !showDeliveryRadius) {
      console.log("Delivery radius panel closed, should focus on order markers");
    }
    
    setPreviousDeliveryRadiusState(showDeliveryRadius);
  }, [showDeliveryRadius, previousDeliveryRadiusState]);
  
  
  // Update highlightedTerminalIds when selectedTerminalIds changes
  useEffect(() => {
    setHighlightedTerminalIds(selectedTerminalIds);
  }, [selectedTerminalIds]);
  
  // Initialize with a default center (use order markers center, or terminal center, or default coordinates)
  const defaultCenter: [number, number] = orderMarkers.length > 0
    ? [
        orderMarkers.reduce((sum, marker) => sum + marker.lat, 0) / orderMarkers.length,
        orderMarkers.reduce((sum, marker) => sum + marker.lon, 0) / orderMarkers.length
      ]
    : terminalMarkers.length > 0 
      ? [terminalMarkers[0].lat, terminalMarkers[0].lon]
      : [41.311151, 69.279737]
  
  console.log("Default center:", defaultCenter)
  console.log('terminalMarkers', terminalMarkers)
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
      .marker-cluster-small {
        background-color: rgba(181, 226, 140, 0.7) !important;
      }
      .marker-cluster-small div {
        background-color: rgba(110, 204, 57, 0.7) !important;
      }
      .marker-cluster-medium {
        background-color: rgba(241, 211, 87, 0.7) !important;
      }
      .marker-cluster-medium div {
        background-color: rgba(240, 194, 12, 0.7) !important;
      }
      .marker-cluster-large {
        background-color: rgba(253, 156, 115, 0.7) !important;
      }
      .marker-cluster-large div {
        background-color: rgba(241, 128, 23, 0.7) !important;
      }
      .marker-cluster.marker-cluster-faded {
        opacity: 0.3;
      }
      /* Custom styles for organization icon markers */
      .leaflet-marker-icon.rounded-full {
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        border: 2px solid white;
        background-color: white;
        object-fit: cover;
      }
      /* Highlighted organization marker */
      .leaflet-marker-icon.highlighted {
        border: 3px solid #3b82f6;
        transform: scale(1.1);
        z-index: 1000 !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Fix Canvas willReadFrequently warning
  useEffect(() => {
    if (typeof window === "undefined") return

    // Добавляем патч для всех canvas элементов, созданных leaflet-heatmap
    const originalHTMLCanvasElementGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(
      this: HTMLCanvasElement, 
      contextId: string, 
      options?: any
    ) {
      if (contextId === '2d') {
        options = options || {}
        options.willReadFrequently = true
      }
      return originalHTMLCanvasElementGetContext.call(this, contextId, options)
    } as typeof HTMLCanvasElement.prototype.getContext

    return () => {
      // Восстанавливаем оригинальный метод при размонтировании
      HTMLCanvasElement.prototype.getContext = originalHTMLCanvasElementGetContext
    }
  }, [])

  // Handle terminal marker click
  const handleTerminalClick = (terminalId: string) => {
    // Find the terminal that was clicked
    const clickedTerminal = terminalMarkers.find(terminal => terminal.id === terminalId);
    
    // Use a functional update to ensure we work with the latest state
    setHighlightedTerminalIds(prevIds => {
      // Check if we're toggling this terminal off
      const isTogglingOff = prevIds.includes(terminalId);
      
      // If toggling off, remove from list
      if (isTogglingOff) {
        return prevIds.filter(id => id !== terminalId);
      }
      
      // Otherwise add to list
      return [...prevIds, terminalId];
    });
  }
  
  // Use useEffect to notify parent about changes in highlightedTerminalIds
  useEffect(() => {
    // Only call the callback if it exists and if highlightedTerminalIds has changed due to user interaction
    if (onTerminalSelect) {
      // Only update if the arrays are actually different
      const isDifferent = 
        highlightedTerminalIds.length !== selectedTerminalIds.length || 
        highlightedTerminalIds.some(id => !selectedTerminalIds.includes(id)) ||
        selectedTerminalIds.some(id => !highlightedTerminalIds.includes(id));
      
      if (isDifferent) {
        // Use a small timeout to break potential circular updates
        const timeoutId = setTimeout(() => {
          onTerminalSelect(highlightedTerminalIds);
        }, 0);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [highlightedTerminalIds, onTerminalSelect, selectedTerminalIds]);
  
  // Context Menu Component
  const ContextMenuComponent = () => {
    const map = useMap();
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number, latlng: L.LatLng } | null>(null);
    
    // Get reference to onCheckDeliveryRadius from props
    const checkRadiusCallback = onCheckDeliveryRadius;
    
    useEffect(() => {
      const handleContextMenu = (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        console.log("Context menu opened at:", e.originalEvent);
        setContextMenuPosition({
          x: e.originalEvent.layerX + 10,
          y: e.originalEvent.layerY + 10,
          latlng: e.latlng
        });
      };
      
      const handleMapClick = () => {
        setContextMenuPosition(null);
      };
      
      // Handle document click to close menu
      const handleDocumentClick = (e: MouseEvent) => {
        setContextMenuPosition(null);
      };
      
      map.on('contextmenu', handleContextMenu);
      map.on('click', handleMapClick);
      document.addEventListener('click', handleDocumentClick);
      
      return () => {
        map.off('contextmenu', handleContextMenu);
        map.off('click', handleMapClick);
        document.removeEventListener('click', handleDocumentClick);
      };
    }, [map]);

    const handleCheckDeliveryRadius = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Check delivery radius clicked before context, coordinates:");
      
      if (!contextMenuPosition) return;
      
      console.log("Check delivery radius clicked, coordinates:", contextMenuPosition.latlng.lat, contextMenuPosition.latlng.lng);
      
      if (typeof checkRadiusCallback === 'function') {
        checkRadiusCallback(contextMenuPosition.latlng.lat, contextMenuPosition.latlng.lng);
      } else {
        console.error("onCheckDeliveryRadius is not a function:", checkRadiusCallback);
      }
      
      setContextMenuPosition(null);
    };
    
    if (!contextMenuPosition) return null;
    
    return (
      <div 
        className="absolute bg-white rounded-md shadow-lg p-2 z-[10000] border border-gray-200"
        style={{ 
          position: 'absolute',
          left: `${contextMenuPosition.x}px`, 
          top: `${contextMenuPosition.y}px`,
          transform: 'translate(5px, -100%)',
          minWidth: '220px',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors font-medium cursor-pointer outline-none focus:bg-muted rounded"
          onClick={handleCheckDeliveryRadius}
          onMouseDown={handleCheckDeliveryRadius}
          style={{ pointerEvents: 'all' }}
        >
          <span className="flex items-center">
            <LayoutGrid className="h-4 w-4 mr-2 text-primary" />
            Проверить радиус доставки
          </span>
        </button>
      </div>
    );
  };
  
  // Add a custom MapBoundsController component to handle bounds updates
  const MapBoundsController = () => {
    const map = useMap();
    const zoomTimeoutRef = useRef<number | null>(null);
    const lastBoundsUpdateRef = useRef<number>(0);
    
    // Smooth version of flyToBounds with easing
    const smoothScrollIntoView = (bounds: L.LatLngBounds) => {
      if (!bounds.isValid()) return;
      
      // Check if we need to zoom in or out
      const currentZoom = map.getZoom();
      const targetZoom = map.getBoundsZoom(bounds, false);
      
      // If current zoom is much higher than target zoom, do a fly animation
      // Otherwise do a faster pan for better UX
      if (Math.abs(currentZoom - targetZoom) > 2) {
        map.flyToBounds(bounds, {
          duration: 1.0,
          easeLinearity: 0.25,
        });
      } else {
        // For small changes, use panTo with a faster animation
        const center = bounds.getCenter();
        map.setView(center, targetZoom, {
          animate: true,
          duration: 0.5,
          easeLinearity: 0.25
        });
      }
    };
    
    // Handle bounds update when delivery radius closes or when highlighted terminals change
    useEffect(() => {
      // Debounce the bounds update to prevent flickering
      if (zoomTimeoutRef.current !== null) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
      
      // Current timestamp to track the latest request
      const currentTime = Date.now();
      lastBoundsUpdateRef.current = currentTime;
      
      // When delivery radius panel is closed and we have order markers
      // Or when highlighted terminals change
      if ((previousDeliveryRadiusState && !showDeliveryRadius && orderMarkers.length > 0) || 
          highlightedTerminalIds.length > 0) {
        
        console.log("Queuing map bounds update");
        
        // Debounce update with timeout
        zoomTimeoutRef.current = window.setTimeout(() => {
          // Only process if this is still the latest requested update
          if (lastBoundsUpdateRef.current !== currentTime) return;
          
          try {
            // Get only the markers for the selected terminals
            const filteredMarkers = highlightedTerminalIds.length > 0 && showOrderClusters
              ? orderMarkers.filter(marker => 
                  marker.terminalId && highlightedTerminalIds.includes(marker.terminalId)
                )
              : orderMarkers;
            
            // Only proceed if we have markers to show
            if (filteredMarkers.length > 0) {
              // Create bounds from filtered order markers
              const bounds = L.latLngBounds(
                filteredMarkers.map(marker => [marker.lat, marker.lon])
              );
              
              // Only if we have valid bounds
              if (bounds.isValid()) {
                console.log("Fitting map to filtered order marker bounds");
                // Use our smooth scroll function
                smoothScrollIntoView(bounds);
                return;
              }
            }
            
            // Fallback to terminal markers if no filtered order markers
            if (highlightedTerminalIds.length > 0) {
              const filteredTerminals = terminalMarkers.filter(
                terminal => highlightedTerminalIds.includes(terminal.id)
              );
              
              if (filteredTerminals.length > 0) {
                const terminalBounds = L.latLngBounds(
                  filteredTerminals.map(marker => [marker.lat, marker.lon])
                );
                
                if (terminalBounds.isValid()) {
                  smoothScrollIntoView(terminalBounds);
                  return;
                }
              }
            }
            
            // Final fallback to all terminal markers
            const allTerminalBounds = L.latLngBounds(
              terminalMarkers.map(marker => [marker.lat, marker.lon])
            );
            
            if (allTerminalBounds.isValid()) {
              smoothScrollIntoView(allTerminalBounds);
            }
          } catch (error) {
            console.error("Error updating map bounds:", error);
          }
        }, 100); // Slight delay to let state updates complete
        
        return () => {
          if (zoomTimeoutRef.current !== null) {
            window.clearTimeout(zoomTimeoutRef.current);
          }
        };
      }
    }, [
      map, 
      showDeliveryRadius, 
      previousDeliveryRadiusState, 
      orderMarkers, 
      terminalMarkers, 
      highlightedTerminalIds,
      showOrderClusters
    ]);
    
    return null;
  };
  
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
        
        <ZoomControl position="topright" />
        
        {/* Terminal markers with offset to prevent overlapping */}
        {offsetTerminalMarkers.map((terminal) => {
          // Check if terminal has organization icon
          const isHighlighted = highlightedTerminalIds.includes(terminal.id);
          
          // Create icon based on whether organization icon is available
          const markerIcon = terminal.organizationIconUrl 
            ? new L.Icon({
                iconUrl: terminal.organizationIconUrl,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -18],
                className: `rounded-full border-2 ${isHighlighted ? 'border-primary' : 'border-white'} shadow-md bg-white`
              })
            : new L.Icon({
                iconUrl: '/leaflet/store-marker.png',
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36],
                className: isHighlighted ? 'highlighted' : ''
              });
          
          return (
            <Marker
              key={terminal.id}
              position={[terminal.lat, terminal.lon]}
              icon={markerIcon}
              eventHandlers={{
                click: () => handleTerminalClick(terminal.id)
              }}
            >
              <Popup>
                <div className="p-1">
                  {terminal.organizationIconUrl && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={terminal.organizationIconUrl} 
                        alt={terminal.organizationName || ""} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    </div>
                  )}
                  <div className="font-bold text-base">{terminal.name}</div>
                  {terminal.organizationName && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {terminal.organizationName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {isHighlighted 
                      ? "Филиал выделен. Нажмите снова, чтобы снять выделение."
                      : "Нажмите, чтобы выделить заказы этого филиала."}
                  </p>
                  {terminal.originalLat && terminal.originalLon && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Примечание: этот маркер немного смещен для лучшей видимости.
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Heat map layer */}
        <HeatmapLayerComponent points={heatMapData} />
        
        {/* Order markers with clustering */}
        <OrderMarkersComponent 
          markers={orderMarkers} 
          show={showOrderClusters} 
          highlightedTerminalIds={highlightedTerminalIds}
        />
        
        {/* Delivery radius circle */}
        {showDeliveryRadius && deliveryRadiusPoint && (
          <DeliveryRadiusCircle 
            center={[deliveryRadiusPoint.lat, deliveryRadiusPoint.lon]} 
            radius={deliveryRadius} 
          />
        )}
        
        {/* Set map bounds based on terminals or orders depending on context */}
        {terminalMarkers.length > 0 && !showDeliveryRadius && highlightedTerminalIds.length === 0 && (
          <MapBoundsHandler 
            markers={terminalMarkers}
            orderMarkers={orderMarkers}
            showOrderMarkersOnly={orderMarkers.length > 0 && showOrderClusters}
          />
        )}
        
        {/* Bounds controller for delivery radius changes and terminal selection */}
        <MapBoundsController />
        
        {/* Context Menu */}
        <ContextMenuComponent />
      </MapContainer>
    </div>
  )
} 