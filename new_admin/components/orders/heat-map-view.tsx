"use client"

import * as React from "react"
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Check, ChevronsUpDown, Loader2, Thermometer, MapPin, X, Clock, Activity, LayoutGrid, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/eden-client"
import dynamic from "next/dynamic"
import { sortTerminalsByName } from "../../lib/sort_terminals_by_name"
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { TerminalDeliveryStats } from "@/types/terminal-stats"
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"

// Import Leaflet components dynamically to avoid SSR issues
const HeatMapComponent = dynamic(
  () => import("./heat-map-component"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
)

interface Terminal {
  id: string
  name: string
  latitude?: number
  longitude?: number
  active?: boolean
  region?: string
}

interface OrderLocation {
  lat: number
  lon: number
  count: number
  orderId?: string
  address?: string
  status?: string
  terminalId?: string
}

interface DeliveryRadiusPoint {
  lat: number
  lon: number
}

export function HeatMapView() {
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -7),
    to: new Date()
  })
  const [showOrderClusters, setShowOrderClusters] = useState<boolean>(true)
  
  // Delivery radius state
  const [deliveryRadiusPoint, setDeliveryRadiusPoint] = useState<DeliveryRadiusPoint | null>(null)
  const [deliveryRadius, setDeliveryRadius] = useState<number>(3) // Default 3km
  const [showDeliveryRadius, setShowDeliveryRadius] = useState<boolean>(false)
  
  // Add filter panel toggle state with localStorage persistence
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true)
  
  // Stats panel toggle state with localStorage persistence
  const [showStatsPanel, setShowStatsPanel] = useState<boolean>(true)
  
  // Load UI state from localStorage on component mount
  useEffect(() => {
    const savedFiltersState = localStorage.getItem("heatmap-filters-visible")
    if (savedFiltersState !== null) {
      setShowFiltersPanel(savedFiltersState === "true")
    }
    
    const savedStatsState = localStorage.getItem("heatmap-stats-visible")
    if (savedStatsState !== null) {
      setShowStatsPanel(savedStatsState === "true")
    }
  }, [])
  
  // Save UI state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("heatmap-filters-visible", showFiltersPanel.toString())
  }, [showFiltersPanel])
  
  useEffect(() => {
    localStorage.setItem("heatmap-stats-visible", showStatsPanel.toString())
  }, [showStatsPanel])

  // Fetch terminals with React Query
  const { data: terminalsData } = useQuery({
    queryKey: ["terminals_cached"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.terminals.cached.get()
        
        // Проверяем, что данные получены и это массив
        if (!data || !Array.isArray(data)) {
          console.error("Invalid terminals data:", data);
          return [];
        }
        
        // Фильтруем невалидные записи
        const validTerminals = data.filter(terminal => 
          terminal && typeof terminal === 'object' && terminal.id && terminal.name && terminal.active && terminal.region == 'capital'
        );
        
        // Сортируем результат
        return sortTerminalsByName(validTerminals);
      } catch (error) {
        console.error("Error fetching terminals:", error);
        toast.error("Ошибка загрузки филиалов");
        return [];
      }
    }
  })
  
  const terminals = terminalsData || []

  // Fetch order locations with React Query when selected terminals or date range changes
  const { data: orderLocationsData, isLoading } = useQuery({
    queryKey: ["orderLocations", selectedTerminals, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      // if (!selectedTerminals.length) return []
      
      const queryParams: {
        terminal_id?: string
        from_date: string
        to_date: string
      } = {
        terminal_id: selectedTerminals.join(","),
        from_date: dateRange?.from?.toISOString().split('T')[0] || addDays(new Date(), -7).toISOString().split('T')[0],
        to_date: dateRange?.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      }
      
      // Add date range if available
        // queryParams.from_date = dateRange.from.toISOString().split('T')[0]
        // queryParams.to_date = dateRange.to.toISOString().split('T')[0]
      
      const { data } = await apiClient.api.orders.filtered_list_in_map.get({
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
              count: 1,
              orderId: order.id,
              address: order.to_address,
              status: order.status,
              terminalId: order.terminal_id
            })
          }
        })
        
        return Array.from(locationMap.values())
      }
      
      return []
    },
    // enabled: selectedTerminals.length > 0
  })
  
  // Fetch terminal statistics
  const { data: terminalStatsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["terminalStats", selectedTerminals, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!selectedTerminals.length) return []
      
      const { data } = await apiClient.api.orders["terminal-delivery-stats"].get({
        query: {
          terminal_id: selectedTerminals.join(","),
          from_date: dateRange?.from?.toISOString().split('T')[0] || addDays(new Date(), -7).toISOString().split('T')[0],
          to_date: dateRange?.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
        }
      })
      
      return data as TerminalDeliveryStats[]
    },
    enabled: selectedTerminals.length > 0
  })
  
  const orderLocations = orderLocationsData || []
  const terminalStats = terminalStatsData || []

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    if (!terminalStats.length) return null
    
    const totalOrders = terminalStats.reduce((sum, stat) => sum + stat.total_orders, 0)
    
    // Format for display
    return {
      totalOrders,
      totalTerminals: terminalStats.length
    }
  }, [terminalStats])

  // Prepare terminal markers for the map
  const terminalMarkers = useMemo(() => {
    return terminals
      .filter(terminal => terminal.latitude && terminal.longitude && 
        (terminal.active === undefined || terminal.active === true) && 
        (terminal.region === undefined || terminal.region === 'capital'))
      .map(terminal => ({
        id: terminal.id,
        name: terminal.name,
        lat: terminal.latitude!,
        lon: terminal.longitude!,
      }))
  }, [terminals])

  // Prepare heat map data for the map
  const heatMapData = useMemo(() => {
    return orderLocations.map(location => ({
      lat: location.lat,
      lon: location.lon,
      intensity: Math.min(location.count * 0.5, 1.0), // Normalize intensity
    }))
  }, [orderLocations])

  // Calculate the distance between two points using the Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Filter order markers based on delivery radius
  const filteredOrderMarkers = useMemo(() => {
    try {
      if (!showDeliveryRadius || !deliveryRadiusPoint) {
        return showOrderClusters ? orderLocations.map(location => ({
          lat: location.lat,
          lon: location.lon,
          count: location.count,
          orderId: location.orderId,
          address: location.address,
          status: location.status,
          terminalId: location.terminalId
        })) : [];
      }
      
      // Filter orders within the delivery radius
      return orderLocations
        .filter(location => {
          try {
            const distance = calculateDistance(
              deliveryRadiusPoint.lat, 
              deliveryRadiusPoint.lon, 
              location.lat, 
              location.lon
            );
            return distance <= deliveryRadius;
          } catch (error) {
            console.error("Error calculating distance:", error);
            return false;
          }
        })
        .map(location => ({
          lat: location.lat,
          lon: location.lon,
          count: location.count,
          orderId: location.orderId,
          address: location.address,
          status: location.status,
          terminalId: location.terminalId
        }));
    } catch (error) {
      console.error("Error filtering order markers:", error);
      return [];
    }
  }, [orderLocations, showOrderClusters, deliveryRadiusPoint, deliveryRadius, showDeliveryRadius]);
  
  // Count of orders within radius
  const ordersInRadiusCount = useMemo(() => {
    try {
      if (!showDeliveryRadius || !deliveryRadiusPoint) return 0;
      
      if (!Array.isArray(filteredOrderMarkers)) {
        console.error("Invalid filteredOrderMarkers:", filteredOrderMarkers);
        return 0;
      }
      
      return filteredOrderMarkers.reduce((sum, marker) => {
        return sum + (marker.count || 0);
      }, 0);
    } catch (error) {
      console.error("Error counting orders in radius:", error);
      return 0;
    }
  }, [filteredOrderMarkers, showDeliveryRadius, deliveryRadiusPoint]);
  
  // Handle checking delivery radius
  const handleCheckDeliveryRadius = useCallback((lat: number, lon: number) => {
    try {
      console.log("HeatMapView: Setting delivery radius point:", { lat, lon });
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
      }
      
      // Update state
      console.log("HeatMapView: Before state update - showDeliveryRadius:", showDeliveryRadius, "deliveryRadiusPoint:", deliveryRadiusPoint);
      setDeliveryRadiusPoint({ lat, lon });
      setShowDeliveryRadius(true);
      
      // Автоматически скрываем панель фильтров при включении радиуса доставки
      setShowFiltersPanel(false);
      
      console.log("HeatMapView: Delivery radius point set successfully");
      
      // Add timeout to verify state update
      setTimeout(() => {
        console.log("HeatMapView: After state update - showDeliveryRadius:", showDeliveryRadius, "deliveryRadiusPoint:", deliveryRadiusPoint);
      }, 100);
    } catch (error) {
      console.error("Error setting delivery radius:", error);
      toast.error("Ошибка при установке радиуса доставки");
    }
  }, [showDeliveryRadius, deliveryRadiusPoint]);
  
  // Handle terminal selection from the map component
  const handleTerminalSelect = useCallback((terminalIds: string[]) => {
    console.log('Terminal selected on map:', terminalIds);
    
    // Only update if the arrays are actually different
    const isDifferent = 
      terminalIds.length !== selectedTerminals.length || 
      terminalIds.some(id => !selectedTerminals.includes(id)) ||
      selectedTerminals.some(id => !terminalIds.includes(id));
    
    if (isDifferent) {
      setSelectedTerminals(terminalIds);
    }
  }, [selectedTerminals]);

  // Close radius panel
  const handleCloseRadiusPanel = () => {
    console.log("HeatMapView: Closing radius panel");
    // We're just hiding the panel, but maintaining order clusters visibility
    setShowDeliveryRadius(false);
    setDeliveryRadiusPoint(null);
    
    // Ensure order clusters are visible when closing the radius panel if they were previously enabled
    if (!showOrderClusters) {
      console.log("HeatMapView: Enabling order clusters after closing radius panel");
      setShowOrderClusters(true);
    }
  };

  // Функция очистки всех фильтров
  const handleClearAllFilters = useCallback(() => {
    setSelectedTerminals([]);
    setDateRange({
      from: addDays(new Date(), -7),
      to: new Date()
    });
    setShowOrderClusters(true);
    
    // Также сбрасываем радиус доставки, если он активен
    if (showDeliveryRadius) {
      setShowDeliveryRadius(false);
      setDeliveryRadiusPoint(null);
    }
    
    toast.success("Все фильтры сброшены");
  }, [showDeliveryRadius]);

  console.log('selectedTerminals', selectedTerminals)
  console.log('showDeliveryRadius:', showDeliveryRadius, 'deliveryRadiusPoint:', deliveryRadiusPoint)
  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-[calc(100vh-4rem)]">
        {/* Filter toggle button */}
        <div className="absolute top-4 left-4 z-[1001]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shadow-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              >
                <Filter className="h-5 w-5" />
                {selectedTerminals && selectedTerminals.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-white">
                    {selectedTerminals.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{showFiltersPanel ? "Скрыть фильтры" : "Показать фильтры"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Clear filters button */}
        {Boolean((selectedTerminals && selectedTerminals.length > 0) || showDeliveryRadius) && (
          <div className="absolute top-4 left-[70px] z-[1001]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-md flex items-center space-x-1 border-destructive/30 bg-background/80 backdrop-blur-sm"
                  onClick={handleClearAllFilters}
                >
                  <X className="h-4 w-4 text-destructive" />
                  <span>Очистить все фильтры</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Сбросить все параметры</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Filters Panel - Top left */}
        <div className={cn(
          "absolute top-4 left-4 z-1000 w-[320px] md:w-[280px] transition-all duration-300",
          showFiltersPanel ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 pointer-events-none"
        )}>
          <Card className="shadow-md ml-14">
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center">
                  <Thermometer className="h-4 w-4 mr-2 text-primary" />
                  Тепловая карта заказов
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {orderLocations.length} локаций
                  {selectedTerminals && selectedTerminals.length > 0 && ` • ${selectedTerminals.length} филиал${selectedTerminals.length > 1 ? 'а' : ''}`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Филиалы</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      size="sm"
                    >
                      {selectedTerminals.length > 0 ? (
                        <span>Выбрано: {selectedTerminals.length}</span>
                      ) : (
                        <span>Выберите филиалы</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command className="max-h-[300px]">
                      <CommandInput placeholder="Поиск филиала..." />
                      <CommandEmpty>Филиалы не найдены.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-auto">
                        {Array.isArray(terminals) && terminals.map((terminal) => {
                          if (!terminal || !terminal.id || !terminal.name) return null;
                          return (
                            <CommandItem
                              key={terminal.id}
                              value={terminal.name}
                              onSelect={() => {
                                try {
                                  setSelectedTerminals((current) => {
                                    if (current.includes(terminal.id)) {
                                      return current.filter(id => id !== terminal.id);
                                    }
                                    return [...current, terminal.id];
                                  });
                                } catch (error) {
                                  console.error("Error selecting terminal:", error);
                                  toast.error("Ошибка при выборе филиала");
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTerminals.includes(terminal.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {terminal.name && terminal.name.length > 20 
                                ? terminal.name.substring(0, 20) + '...' 
                                : terminal.name || 'Без названия'}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedTerminals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTerminals.map(id => {
                      const terminal = terminals.find(t => t.id === id);
                      if (!terminal) return null;
                      return (
                        <Badge 
                          key={id} 
                          variant="secondary"
                          className="text-xs py-0.5 px-2 font-normal flex items-center"
                        >
                          {terminal.name && terminal.name.length > 20 
                            ? terminal.name.substring(0, 20) + '...' 
                            : terminal.name || 'Без названия'}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0 ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedTerminals(current => current.filter(i => i !== id))}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      );
                    })}
                    {selectedTerminals.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-2 text-xs font-normal text-muted-foreground"
                        onClick={() => setSelectedTerminals([])}
                      >
                        Очистить все
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Период</label>
                <DateRangePicker
                  value={dateRange}
                  onChange={(value) => value && setDateRange(value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showClusters"
                  checked={showOrderClusters}
                  onChange={(e) => setShowOrderClusters(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-primary"
                />
                <label htmlFor="showClusters" className="text-sm font-medium flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  Показать маркеры заказов
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Statistics Panel - Bottom Right */}
        {selectedTerminals && selectedTerminals.length > 0 && (
          <div className={cn(
            "absolute bottom-6 right-6 z-1000 w-[320px] transition-all duration-300",
            showStatsPanel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
          )}>
            <Card className="shadow-md">
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-primary" />
                    Статистика доставки
                  </span>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={() => setShowStatsPanel(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isStatsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : terminalStats.length > 0 ? (
                  <div className="space-y-4">
                    {terminalStats.map((stat) => (
                      <div key={stat.terminal_id} className="space-y-2">
                        <h3 className="text-sm font-medium">{stat.terminal_name}</h3>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <div className="text-xs text-muted-foreground">Всего заказов:</div>
                          <div className="text-xs font-medium text-right">{stat.total_orders}</div>
                          
                          <div className="text-xs text-muted-foreground">Среднее время:</div>
                          <div className="text-xs font-medium text-right flex items-center justify-end">
                            <Clock className="h-3 w-3 mr-1 text-primary" />
                            {stat.average_delivery}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">Быстрейшая доставка:</div>
                          <div className="text-xs font-medium text-right">
                            {stat.fastest_order_id ? (
                              <OrderDetailSheet orderId={stat.fastest_order_id}>
                                <Button variant="link" className="p-0 h-auto text-xs font-medium">
                                  {stat.fastest_delivery}
                                </Button>
                              </OrderDetailSheet>
                            ) : (
                              stat.fastest_delivery
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">Самая долгая:</div>
                          <div className="text-xs font-medium text-right">
                            {stat.slowest_order_id ? (
                              <OrderDetailSheet orderId={stat.slowest_order_id}>
                                <Button variant="link" className="p-0 h-auto text-xs font-medium">
                                  {stat.slowest_delivery}
                                </Button>
                              </OrderDetailSheet>
                            ) : (
                              stat.slowest_delivery
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Нет данных для выбранных филиалов
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Stats toggle button */}
        {selectedTerminals && selectedTerminals.length > 0 && !showStatsPanel && (
          <div className="absolute bottom-6 right-6 z-[1001]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setShowStatsPanel(true)}
                >
                  <Activity className="h-5 w-5" />
                  {aggregatedStats && aggregatedStats.totalOrders > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-white">
                      {aggregatedStats.totalOrders > 99 ? '99+' : aggregatedStats.totalOrders}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Показать статистику {aggregatedStats ? `(${aggregatedStats.totalOrders} заказов)` : ''}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* Delivery Radius Panel - Bottom Left */}
        {showDeliveryRadius && deliveryRadiusPoint && (
          <div className="absolute bottom-6 left-6 z-[9999] w-[300px]">
            <Card className="shadow-lg border-2 border-primary/30">
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center">
                    <LayoutGrid className="h-4 w-4 mr-2 text-primary" />
                    Радиус доставки
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={handleCloseRadiusPanel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Радиус (км):</span>
                    <span className="text-sm font-medium">{deliveryRadius} км</span>
                  </div>
                  <Slider 
                    value={[deliveryRadius]} 
                    min={0.5} 
                    max={10}
                    step={0.5}
                    onValueChange={(value) => setDeliveryRadius(value[0])}
                  />
                </div>
                <div className="text-sm mt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Координаты:</span>
                    <span className="font-medium">{deliveryRadiusPoint.lat.toFixed(5)}, {deliveryRadiusPoint.lon.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Заказы в радиусе:</span>
                    <Badge variant="secondary">{ordersInRadiusCount}</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-4 py-3 border-t flex justify-end">
                <Button variant="outline" size="sm" onClick={handleCloseRadiusPanel}>
                  Закрыть
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
        
        {/* Radius toggle button */}
        {showDeliveryRadius && deliveryRadiusPoint && (
          <div className="absolute top-4 right-4 z-[1001]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-md flex items-center space-x-1 border-primary/40 bg-background/80 backdrop-blur-sm"
                  onClick={handleCloseRadiusPanel}
                >
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <span>Радиус: {deliveryRadius} км</span>
                  <X className="h-4 w-4 ml-1" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Закрыть радиус доставки</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
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
            orderMarkers={filteredOrderMarkers}
            showOrderClusters={showOrderClusters || showDeliveryRadius}
            selectedTerminalIds={selectedTerminals}
            onTerminalSelect={handleTerminalSelect}
            onCheckDeliveryRadius={handleCheckDeliveryRadius}
            deliveryRadiusPoint={deliveryRadiusPoint}
            deliveryRadius={deliveryRadius}
            showDeliveryRadius={showDeliveryRadius}
          />
        </div>
      </div>
    </TooltipProvider>
  )
} 