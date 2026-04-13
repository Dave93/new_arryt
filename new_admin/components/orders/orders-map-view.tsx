"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MultipleSelector, { Option } from "@/components/ui/multiselect"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/eden-client"
import { Loader2, MapPin, X } from "lucide-react"
import dynamic from "next/dynamic"
import type { Order, MapComponentProps } from "./map-component"
import { sortTerminalsByName } from "../../lib/sort_terminals_by_name"

// Import the OrderDetailsClientPage dynamically to avoid SSR issues
const OrderDetailsClientPage = dynamic(
  () => import("@/components/orders/order-details-client-page").then(mod => mod.OrderDetailsClientPage),
  { ssr: false }
)

// Import Leaflet components dynamically to avoid SSR issues
const MapComponent = dynamic<MapComponentProps>(
  () => import("./map-component"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
)

interface Terminal {
  id: string
  name: string
  region: string
}

export function OrdersMapView() {
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([])
  const [selectedCourierOptions, setSelectedCourierOptions] = useState<Option[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersCount, setOrdersCount] = useState(0)
  

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

  // Clear selected couriers when terminals change
  useEffect(() => {
    setSelectedCourierOptions([])
  }, [selectedTerminals])

  // Fetch orders when selected terminals change
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true)
      try {
        const queryParams: Record<string, string> = {}
        if (selectedTerminals.length) {
          queryParams.terminal_id = selectedTerminals.join(",")
        }
          
        const { data } = await apiClient.api.orders.list_in_map.get({
          query: queryParams,
        })
        
        if (data && Array.isArray(data)) {
          const mappedOrders = data.map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            to_lat: order.to_lat,
            to_lon: order.to_lon,
            // Add address if it exists in the API response, otherwise undefined
            address: order.address || order.delivery_address,
            courier_id: order.courier_id,
          }))
          
          setOrders(mappedOrders)
          setOrdersCount(mappedOrders.length)
        }
      } catch (error) {
        console.error("Error fetching orders:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchOrders()
  }, [selectedTerminals])

  // Fetch couriers for search (filtered by selected terminals)
  const fetchCouriers = async (query: string): Promise<Option[]> => {
    try {
      const searchQuery: Record<string, string> = { search: query }
      if (selectedTerminals.length > 0) {
        searchQuery.terminal_id = selectedTerminals.join(",")
      }
      const { data: couriers } = await apiClient.api.couriers.search.get({
        query: searchQuery,
      })

      if (couriers && Array.isArray(couriers)) {
        return couriers.map(courier => ({
          value: courier.id,
          label: `${courier.first_name} ${courier.last_name} (${courier.phone})`,
        }))
      }

      return []
    } catch (error) {
      console.error("Error fetching couriers:", error)
      return []
    }
  }

  // Filter terminals by region
  const filteredTerminals = selectedRegion === "all"
    ? terminals
    : terminals.filter(t => t.region === selectedRegion)

  // Terminal options for MultipleSelector
  const terminalOptions: Option[] = filteredTerminals.map(t => ({ value: t.id, label: t.name }))
  const selectedTerminalOptions: Option[] = selectedTerminals
    .map(id => terminals.find(t => t.id === id))
    .filter((t): t is Terminal => !!t)
    .map(t => ({ value: t.id, label: t.name }))

  const selectedCourierIds = selectedCourierOptions.map(o => o.value)

  // Get marker color based on courier selection
  const getMarkerColor = (order: Order) => {
    if (selectedCourierIds.length > 0 && order.courier_id && selectedCourierIds.includes(order.courier_id)) {
      return "red"
    }
    return "blue"
  }

  // Handle order selection
  const handleOrderSelect = (order: Order) => {
    setSelectedOrderId(order.id)
    setIsPanelOpen(true)
  }

  // Filter orders by selected couriers
  const filteredOrders = selectedCourierIds.length > 0
    ? orders.filter(order => order.courier_id && selectedCourierIds.includes(order.courier_id))
    : orders
    
  const filteredOrdersCount = filteredOrders.length

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div className="absolute top-4 left-4 z-[1000] w-[320px] md:w-[280px]">
        <Card className="shadow-md">
          <CardHeader className="p-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                Заказы на карте
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {filteredOrdersCount} / {ordersCount}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Регион</label>
              <Select
                value={selectedRegion}
                onValueChange={(val) => {
                  setSelectedRegion(val)
                  setSelectedTerminals([])
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все регионы" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="all">Все регионы</SelectItem>
                  <SelectItem value="capital">Столица</SelectItem>
                  <SelectItem value="region">Регион</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Филиалы</label>
              <MultipleSelector
                value={selectedTerminalOptions}
                onChange={(opts) => setSelectedTerminals(opts.map(o => o.value))}
                options={terminalOptions}
                placeholder="Выберите филиалы"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Курьеры</label>
              <MultipleSelector
                value={selectedCourierOptions}
                onChange={setSelectedCourierOptions}
                onSearch={fetchCouriers}
                placeholder="Поиск курьеров..."
                className="w-full"
                triggerSearchOnFocus
                delay={300}
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
        <MapComponent 
          orders={filteredOrders}
          getMarkerColor={getMarkerColor}
          onMarkerClick={handleOrderSelect}
        />
      </div>
      
      {/* Order details panel */}
      {isPanelOpen && (
        <div className="absolute top-0 right-0 h-full w-[95%] sm:w-[90%] md:w-[80%] lg:w-[75%] xl:w-[70%] bg-background border-l shadow-lg z-[1000] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Детали заказа</h3>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedOrderId && <OrderDetailsClientPage orderId={selectedOrderId} />}
          </div>
        </div>
      )}
    </div>
  )
} 