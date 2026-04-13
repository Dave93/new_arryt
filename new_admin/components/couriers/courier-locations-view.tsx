"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { apiClient, useGetAuthHeaders } from "@/lib/eden-client"
import { Loader2, MapPin, RefreshCw, User, Wifi, WifiOff } from "lucide-react"
import dynamic from "next/dynamic"
import type { CourierLocation, CourierLocationsMapProps } from "./courier-locations-map"

const CourierLocationsMap = dynamic<CourierLocationsMapProps>(
  () => import("./courier-locations-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

export function CourierLocationsView() {
  const authHeaders = useGetAuthHeaders()
  const [couriers, setCouriers] = useState<CourierLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.311151, 69.279737])
  const [mapZoom, setMapZoom] = useState(12)

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await apiClient.api.couriers.locations.get({
        $headers: authHeaders,
      })

      if (data && Array.isArray(data)) {
        setCouriers(data as CourierLocation[])
      }
    } catch (error) {
      console.error("Error fetching courier locations:", error)
    } finally {
      setIsLoading(false)
    }
  }, [authHeaders])

  // Initial fetch + polling every 3 seconds
  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 3000)
    return () => clearInterval(interval)
  }, [fetchLocations])

  const onSelectCourier = (id: string) => {
    if (id === "all") {
      setSelectedCourierId(null)
      setMapCenter([41.311151, 69.279737])
      setMapZoom(12)
      return
    }
    setSelectedCourierId(id)
    const courier = couriers.find((c) => c.id === id)
    if (courier) {
      setMapCenter([courier.latitude, courier.longitude])
      setMapZoom(18)
    }
  }

  const onlineCount = couriers.filter((c) => c.is_online).length
  const offlineCount = couriers.filter((c) => !c.is_online).length

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Filter panel */}
      <div className="absolute top-4 left-4 z-[1000] w-[320px] md:w-[300px]">
        <Card className="shadow-md">
          <CardHeader className="p-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                Где курьер
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fetchLocations()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Всего:</span>
                <span className="font-medium">{couriers.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Wifi className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium text-green-600">{onlineCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                <span className="font-medium text-red-500">{offlineCount}</span>
              </div>
            </div>

            {/* Courier select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Навести на курьера
              </label>
              <Select
                value={selectedCourierId ?? "all"}
                onValueChange={onSelectCourier}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите курьера" />
                </SelectTrigger>
                <SelectContent className="z-[9999] max-h-[300px]">
                  <SelectItem value="all">Все курьеры</SelectItem>
                  {couriers
                    .sort((a, b) => {
                      if (a.is_online && !b.is_online) return -1
                      if (!a.is_online && b.is_online) return 1
                      return `${a.last_name} ${a.first_name}`.localeCompare(
                        `${b.last_name} ${b.first_name}`
                      )
                    })
                    .map((courier) => (
                      <SelectItem key={courier.id} value={courier.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              courier.is_online ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          {courier.last_name} {courier.first_name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Map */}
      <div className="h-full w-full">
        <CourierLocationsMap
          couriers={couriers}
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>
    </div>
  )
}
