"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/eden-client"
import { Loader2, Thermometer } from "lucide-react"
import dynamic from "next/dynamic"
import { sortTerminalsByName } from "../../lib/sort_terminals_by_name"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"

// Import Leaflet components dynamically to avoid SSR issues
const HeatMapComponent = dynamic(
  () => import("./heat-map-component"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
)

interface Terminal {
  id: string
  name: string
  lat?: number
  lon?: number
}

interface OrderLocation {
  lat: number
  lon: number
  count: number
}

export function HeatMapView() {
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [orderLocations, setOrderLocations] = useState<OrderLocation[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date()
  })

  // Fetch all terminals
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        const { data } = await apiClient.api.terminals.cached.get()
        
        if (data && Array.isArray(data)) {
          setTerminals(sortTerminalsByName(data))
        }
      } catch (error) {
        console.error("Error fetching terminals:", error)
      }
    }
    
    fetchTerminals()
  }, [])

  // Fetch order locations when selected terminals or date range changes
  useEffect(() => {
    const fetchOrderLocations = async () => {
      if (!selectedTerminals.length) return
      
      setIsLoading(true)
      try {
        const queryParams: Record<string, string> = {
          terminal_id: selectedTerminals.join(","),
        }
        
        // Add date range if available
        if (dateRange?.from) {
          queryParams.from_date = dateRange.from.toISOString().split('T')[0]
        }
        if (dateRange?.to) {
          queryParams.to_date = dateRange.to.toISOString().split('T')[0]
        }
        
        // Use list endpoint instead of locations (assuming it returns location data)
        // This should be updated when a dedicated endpoint is available
        const { data } = await apiClient.api.orders.list_in_map.get({
          query: queryParams,
        })
        
        if (data && Array.isArray(data)) {
          // Transform data for heat map - group by location and count occurrences
          const locationMap = new Map<string, OrderLocation>()
          
          data.forEach((order: any) => {
            if (!order.to_lat || !order.to_lon) return
            
            const key = `${order.to_lat},${order.to_lon}`
            if (locationMap.has(key)) {
              const location = locationMap.get(key)!
              location.count += 1
            } else {
              locationMap.set(key, {
                lat: order.to_lat,
                lon: order.to_lon,
                count: 1
              })
            }
          })
          
          setOrderLocations(Array.from(locationMap.values()))
        }
      } catch (error) {
        console.error("Error fetching order locations:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchOrderLocations()
  }, [selectedTerminals, dateRange])

  // Handle terminal selection change
  const handleTerminalChange = (value: string) => {
    setSelectedTerminals([value])
  }

  // Prepare terminal markers for the map
  const terminalMarkers = useMemo(() => {
    return terminals
      .filter(terminal => terminal.lat && terminal.lon)
      .map(terminal => ({
        id: terminal.id,
        name: terminal.name,
        lat: terminal.lat!,
        lon: terminal.lon!,
      }))
  }, [terminals])

  // Prepare heat map data for the map
  const heatMapData = useMemo(() => {
    return orderLocations.map(location => ({
      lat: location.lat,
      lon: location.lon,
      intensity: Math.min(location.count * 0.5, 1.0), // Normalize intensity (0-1)
    }))
  }, [orderLocations])

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div className="absolute top-4 left-4 z-1000 w-[320px] md:w-[280px]">
        <Card className="shadow-md">
          <CardHeader className="p-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center">
                <Thermometer className="h-4 w-4 mr-2 text-primary" />
                Тепловая карта заказов
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {orderLocations.length} локаций
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Филиалы</label>
              <Select
                value={selectedTerminals.length === 1 ? selectedTerminals[0] : undefined}
                onValueChange={handleTerminalChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent className="z-1000">
                  {terminals.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      {terminal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Период</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {/* Map Component */}
      <div className="h-full w-full">
        <HeatMapComponent 
          heatMapData={heatMapData}
          terminalMarkers={terminalMarkers}
        />
      </div>
    </div>
  )
} 