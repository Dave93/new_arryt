"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AsyncCombobox, ComboboxOption } from "@/components/ui/async-combobox"
import { apiClient } from "@/lib/eden-client"
import { Drawer } from "@/components/ui/drawer"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Loader2, MapPin } from "lucide-react"
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
}

export function OrdersMapView() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState<string | undefined>(undefined)
  const [selectedCourierOption, setSelectedCourierOption] = useState<ComboboxOption | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
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

  // Fetch couriers for search
  const fetchCouriers = async (query: string) => {
    try {
      const { data: couriers } = await apiClient.api.couriers.search.get({
        query: { search: query },
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

  // Handle terminal selection change
  const handleTerminalChange = (value: string) => {
    setSelectedTerminals([value])
  }

  // Handle courier selection change
  const handleCourierChange = (value: ComboboxOption | null) => {
    setSelectedCourierOption(value)
    setSelectedCourier(value?.value)
  }

  // Get marker color based on courier selection
  const getMarkerColor = (order: Order) => {
    if (selectedCourier && order.courier_id === selectedCourier) {
      return "red" // Red for selected courier's orders
    }
    return "blue" // Blue for other orders
  }

  // Handle order selection
  const handleOrderSelect = (order: Order) => {
    setSelectedOrderId(order.id)
    setIsSheetOpen(true)
  }

  // Filter orders by selected courier if one is selected
  const filteredOrders = selectedCourier
    ? orders.filter(order => order.courier_id === selectedCourier)
    : orders
    
  const filteredOrdersCount = filteredOrders.length

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div className="absolute top-4 left-4 z-1000 w-[320px] md:w-[280px]">
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
              <label className="text-sm font-medium text-muted-foreground">Курьеры</label>
              <AsyncCombobox
                value={selectedCourierOption}
                onChange={handleCourierChange}
                fetchOptions={fetchCouriers}
                placeholder="Поиск курьера"
                clearable
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
      
      {/* Order details sheet/drawer */}
      {isMobile ? (
        <Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <div className="p-4">
            {selectedOrderId && <OrderDetailsClientPage orderId={selectedOrderId} />}
          </div>
        </Drawer>
      ) : (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Детали заказа</SheetTitle>
            </SheetHeader>
            <div className="px-0 py-0">
              {selectedOrderId && <OrderDetailsClientPage orderId={selectedOrderId} />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
} 