"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "@/lib/eden-client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { ChangeOrderCourier } from "@/components/orders/change-courier";

// Define the Order Location type
interface OrderLocation {
  id: string;
  lat: number;
  lon: number;
  created_at: string;
  // Assuming order_status is nested like in the reference, adjust if needed
  order_status?: {
    id: string;
    name: string;
    color: string;
  };
  order_status_id?: string; // Or just the ID
}

// Define the OrderAction type (based on reference query fields)
interface OrderAction {
  id: string;
  created_at: string;
  action: string; // Might be useful for icons or specific styling later
  action_text: string;
  duration: number; // Assuming duration is in seconds
  users?: { // User might be optional
    first_name: string;
    last_name: string;
  } | null;
}

// Define the OrderItem type
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  // Add other potential fields like product_id, sku etc. if needed
}

// Define the Order type for the client component
interface Order {
  id: string;
  order_number: string;
  created_at: string;
  order_price: number;
  delivery_price: number;
  payment_type: string;
  delivery_type: string;
  delivery_address: string;
  from_lat?: number; // Origin Latitude
  from_lon?: number; // Origin Longitude
  to_lat?: number;   // Destination Latitude
  to_lon?: number;   // Destination Longitude
  order_status: {
    id: string;
    name: string;
    color: string;
  };
  customers: {
    id: string;
    name: string;
    phone: string;
  };
  couriers: {
    id: string;
    first_name: string;
    last_name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  terminals: {
    id: string;
    name: string;
  };
  finished_date?: string | null;
}

// Define the Order Status type (based on reference and likely API structure)
interface OrderStatus {
  id: string;
  name: string;
  color: string;
  organization_id: string; // Assuming organization_id is present
}

// Define props for the client component
interface OrderDetailsClientPageProps {
  orderId: string;
}

// Skeleton component for loading state
function OrderDetailsSkeleton() {
  return (
    <div className="container mx-auto py-10">
      {/* Skeleton for Back Button */}
      <Skeleton className="h-9 w-32 mb-4" /> 
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-1/3 mb-6" /> {/* TabsList Skeleton */}
          <div className="grid grid-cols-2 gap-6">
            {/* Order Info Skeleton */}
            <div>
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            {/* Customer Info Skeleton */}
            <div>
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            {/* Courier Info Skeleton */}
            <div>
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            {/* Organization Info Skeleton */}
            <div>
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Dynamically import the map component to avoid SSR issues with Leaflet
const OrderMap = dynamic(() => import("@/components/orders/order-map"), { 
  ssr: false, 
  loading: () => <Skeleton className="h-full w-full" /> // Add a loading skeleton for the map
});

export default function OrderDetailsClientPage({ orderId }: OrderDetailsClientPageProps) {
  const authHeaders = useGetAuthHeaders();
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isItemsTabActive, setIsItemsTabActive] = useState(false);
  const [isTimelineTabActive, setIsTimelineTabActive] = useState(false); // State for timeline tab

  // --- Helper function to format duration (seconds) ---
  function formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
  
    const HH = String(hours).padStart(2, '0');
    const MM = String(minutes).padStart(2, '0');
    const SS = String(remainingSeconds).padStart(2, '0');
  
    return `${HH}:${MM}:${SS}`;
  }

  // Define the query function
  const fetchOrderDetails = async (id: string): Promise<Order> => {
    if (!authHeaders) {
      // Handle case where auth headers are not ready (optional, depends on useGetAuthHeaders)
      throw new Error("Authentication headers not available");
    }
    try {
      const response = await apiClient.api.orders({id}).get({
        query: {
          fields: [
            "id", "order_number", "created_at", "order_price", "delivery_price",
            "payment_type", "delivery_type", "delivery_address", "from_lat", "from_lon",
            "to_lat", "to_lon",
            "order_status.id", "order_status.name", "order_status.color",
            "customers.id", "customers.name", "customers.phone",
            "couriers.id", "couriers.first_name", "couriers.last_name",
            "organization.id", "organization.name",
            "terminals.id", "terminals.name",
            "finished_date"
            // Add other fields as required
          ].join(","),
        },
        headers: authHeaders,
      });
      if (!response.data || !response.data.data) { // Check response structure
        throw new Error("Order not found");
      }
      return response.data.data as Order;
    } catch (error) {
      console.error("Fetch order error:", error);
      throw error;
    }
  };

  // Use React Query's useQuery hook
  const { 
    data: order,
    isLoading: isLoadingOrder,
    isError: isErrorOrder,
    error: errorOrder
  } = useQuery<Order, Error>({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderDetails(orderId),
    enabled: !!orderId && !!authHeaders,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  // --- Fetch Order Actions (Timeline) ---
  const fetchOrderActions = async (id: string, orderCreatedAt: string): Promise<OrderAction[]> => {
    if (!authHeaders) {
      throw new Error("Authentication headers not available");
    }
    try {
      // Endpoint based on reference: apiClient.api.order_actions.get()
      const response = await apiClient.api.order_actions.index.get({ 
        query: {
          limit: "100", // Fetch up to 100 actions, adjust as needed
          offset: "0",
          fields: "id,created_at,action,action_text,duration,users.first_name,users.last_name",
          // Use JSON stringify for filters as in the reference
          filters: JSON.stringify([
            {
              field: "order_id",
              operator: "eq",
              value: id,
            },
            {
              field: "order_created_at", // Filter by creation date if needed
              operator: "gte",
              value: orderCreatedAt, // Use the order's creation date
            },
          ]),
        },
        headers: authHeaders, 
      });
      // Adjust based on actual API response structure for actions
      // Assuming response.data.data contains the array based on reference structure
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) { 
        console.warn("No order actions data received or invalid format", response.data);
        return [];
      }
      return response.data.data as OrderAction[];
    } catch (error) {
      console.error("Fetch order actions error:", error);
      toast.error("Could not load order timeline");
      throw error; 
    }
  };

  const { 
    data: orderActions = [], 
    isLoading: isLoadingActions,
    isError: isErrorActions,
  } = useQuery<OrderAction[], Error>({
    queryKey: ["orderActions", orderId], 
    queryFn: () => fetchOrderActions(orderId, order!.created_at), // Pass order created_at
    // Enable only when the timeline tab is active AND order data is available
    enabled: isTimelineTabActive && !!order?.created_at, 
    staleTime: 5 * 60 * 1000, // Cache timeline for 5 mins
    gcTime: 10 * 60 * 1000,
  });

  // --- Fetch Order Locations --- 
  const fetchOrderLocations = async (id: string): Promise<OrderLocation[]> => {
    if (!authHeaders) {
      throw new Error("Authentication headers not available");
    }
    try {
      // Assuming this endpoint exists and returns OrderLocation[]
      const response = await apiClient.api.orders({id}).locations.post({
        // @ts-ignore
        created_at: order?.created_at,
      },{ 
        // Add query params like created_at if needed, similar to reference
        // query: { created_at: order?.created_at }, 
        headers: authHeaders, 
      });
      // Adjust based on actual API response structure
      if (!response.data || !Array.isArray(response.data)) { 
        console.warn("No location data received or invalid format");
        return []; // Return empty array if no data or wrong format
      }
      return response.data as OrderLocation[];
    } catch {
      // Don't throw error here, map can be displayed without history
      // Or handle specific errors if needed
      toast.error("Could not load location history");
      return []; // Return empty array on error
    }
  };

  const { 
    data: locations,
    isLoading: isLoadingLocations, // Separate loading state for locations
    // We might not need explicit error handling UI for locations if it's optional
  } = useQuery<OrderLocation[], Error>({
    queryKey: ["orderLocations", orderId],
    queryFn: () => fetchOrderLocations(orderId),
    // Enable only after order details (especially created_at if needed) are loaded and order exists
    enabled: !!orderId && !!authHeaders && !!order, 
    staleTime: 1 * 60 * 1000, // Shorter stale time for locations? Adjust as needed.
    gcTime: 5 * 60 * 1000,
    retry: 0, // Maybe don't retry location fetch failures aggressively
  });

  // --- Fetch Available Order Statuses ---
  const fetchOrderStatuses = async (organizationId: string): Promise<OrderStatus[]> => {
    if (!authHeaders) {
      throw new Error("Authentication headers not available");
    }
    try {
      // Adapt the endpoint and query based on your actual API structure for fetching statuses
      const response = await apiClient.api.order_status.cached.get({ // Using cached endpoint as in reference
        query: {
          organization_id: organizationId,
          // Add other filters if necessary, e.g., is_active: true
        },
        headers: authHeaders,
      });
      console.log('response', response)
      if (!response.data || !Array.isArray(response.data)) { // Adjust based on your API response
         console.warn("No status data received or invalid format");
         return [];
      }
      return response.data as OrderStatus[];
    } catch (error) {
      console.error("Fetch statuses error:", error);
      toast.error("Could not load available order statuses");
      throw error; // Re-throw to let react-query handle the error state
    }
  };

  const { 
    data: availableStatuses = [], // Default to empty array
    isLoading: isLoadingStatuses, 
    isError: isErrorStatuses 
  } = useQuery<OrderStatus[], Error>({
    queryKey: ["orderStatuses", order?.organization.id], // Use organization ID in key
    queryFn: () => fetchOrderStatuses(order!.organization.id),
    // Enable only when order details (including organization id) are loaded
    enabled: !!order?.organization.id && !!authHeaders, 
    staleTime: Infinity, // Statuses might not change often, cache indefinitely
    gcTime: Infinity,
  });

  // --- Mutation to Update Order Status ---
  const updateStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      if (!authHeaders || !order) {
        throw new Error("Cannot update status: Missing auth headers or order data.");
      }
      const response = await apiClient.api.orders({id: orderId}).set_status.post({
        status_id: statusId,
        created_at: order.created_at,
      },{
        headers: authHeaders,
      });

      if (response.status !== 200 && response.status !== 201) {
        // Define a proper interface for the error response
        interface ErrorResponse {
          message?: string;
          error?: string;
        }
        const errorBody = response.data as ErrorResponse;
        const errorMessage = errorBody?.message || errorBody?.error || "Failed to update status";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success("Order status updated successfully!");
      // Invalidate the order query to refetch and show the updated status
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setPopoverOpen(false); // Close the popover on success
    },
    onError: (error: Error) => {
      toast.error("Failed to update order status", {
        description: error.message || "An unexpected error occurred.",
      });
      setPopoverOpen(false); // Close the popover on error too
    },
  });

  // --- Fetch Order Items (Conditional) ---
  const fetchOrderItems = async (id: string): Promise<OrderItem[]> => {
    if (!authHeaders) {
      throw new Error("Authentication headers not available");
    }
    try {
      // Endpoint based on reference: apiClient.api.orders[id].items.get()
      const response = await apiClient.api.orders({id}).items.get({ 
        headers: authHeaders, 
      });
      // Adjust based on actual API response structure for items
      if (!response.data || !Array.isArray(response.data)) { // Assuming response.data is the array
        console.warn("No order items data received or invalid format", response.data);
        return [];
      }
      return response.data as OrderItem[];
    } catch (error) {
      console.error("Fetch order items error:", error);
      toast.error("Could not load order items");
      throw error; 
    }
  };

  const { 
    data: orderItems = [], 
    isLoading: isLoadingItems,
    isError: isErrorItems,
    // refetch: refetchItems // Added refetch function
  } = useQuery<OrderItem[], Error>({
    queryKey: ["orderItems", orderId], 
    queryFn: () => fetchOrderItems(orderId),
    enabled: isItemsTabActive, // Enable only when the items tab is active
    staleTime: 5 * 60 * 1000, // Cache items for 5 mins
    gcTime: 10 * 60 * 1000,
  });

  // Handle combined loading/error states
  if (isLoadingOrder) {
    return <OrderDetailsSkeleton />;
  }

  if (isErrorOrder) {
    toast.error("Failed to fetch order details", {
      description: errorOrder?.message || "An unexpected error occurred. Please try again.",
    });
    return <div>Error loading order details. Please try refreshing the page.</div>;
  }

  if (!order) {
    return <div>Order not found or failed to load.</div>;
  }

  // Calculate total items price based on the separately fetched items
  const totalItemsPrice = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // At this point we've already checked that order exists, so it's safe to use
  const orderData = order as Order;
  
  // Keep the JSX structure, using the 'order' data from useQuery
  return (
    <div className="container mx-auto pb-10 space-y-3">
      {/* Back to List Button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться к списку заказов
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <CardTitle>Заказ №{orderData.order_number}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {orderData.finished_date 
                  ? `Доставка завершена за ${Math.round(
                      (new Date(orderData.finished_date).getTime() - new Date(orderData.created_at).getTime()) / 60000
                    )} минут` 
                  : "Доставка не завершена"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge style={{ backgroundColor: orderData.order_status.color }} className="text-white">
                {orderData.order_status.name}
              </Badge>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-[200px] justify-between"
                    size="sm"
                    disabled={isLoadingStatuses || isErrorStatuses || updateStatusMutation.isPending}
                  >
                    {isLoadingStatuses ? "Загрузка..." : "Изменить статус"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 z-[900]">
                  <Command>
                    <CommandInput placeholder="Поиск статуса..." />
                    <CommandList>
                      <CommandEmpty>Статусы не найдены.</CommandEmpty>
                      <CommandGroup>
                        {availableStatuses.map((status) => (
                          <CommandItem
                            key={status.id}
                            value={status.name}
                            onSelect={() => {
                              if (status.id !== orderData.order_status.id) {
                                updateStatusMutation.mutate(status.id);
                              } else {
                                setPopoverOpen(false);
                              }
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                orderData.order_status.id === status.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span style={{ backgroundColor: status.color || 'inherit' }} className="mr-2 rounded-full w-4 h-4"></span>
                            {status.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="details" 
            onValueChange={(value) => {
              setIsItemsTabActive(value === 'items');
              setIsTimelineTabActive(value === 'timeline');
            }}
          >
            <TabsList>
              <TabsTrigger value="details">Детали</TabsTrigger>
              <TabsTrigger value="items">Товары</TabsTrigger>
              <TabsTrigger value="timeline">Хронология</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Информация о заказе</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Дата создания:</span>{" "}
                        {format(new Date(orderData.created_at), "PPp")}
                      </p>
                      <p>
                        <span className="font-medium">Стоимость заказа:</span>{" "}
                        {new Intl.NumberFormat("ru").format(orderData.order_price)}
                      </p>
                      <p>
                        <span className="font-medium">Стоимость доставки:</span>{" "}
                        {new Intl.NumberFormat("ru").format(orderData.delivery_price)}
                      </p>
                      <p>
                        <span className="font-medium">Способ оплаты:</span>{" "}
                        {orderData.payment_type}
                      </p>
                      <p>
                        <span className="font-medium">Тип доставки:</span>{" "}
                        {orderData.delivery_type}
                      </p>
                      <p>
                        <span className="font-medium">Адрес:</span>{" "}
                        {orderData.delivery_address}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Информация о клиенте</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Имя:</span>{" "}
                        {orderData.customers.name}
                      </p>
                      <p>
                        <span className="font-medium">Телефон:</span>{" "}
                        {orderData.customers.phone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Информация о курьере</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <p>
                          <span className="font-medium">Имя:</span>{" "}
                          {orderData.couriers ? `${orderData.couriers.first_name} ${orderData.couriers.last_name}` : 'Не назначен'}
                        </p>
                        <ChangeOrderCourier 
                          orderId={orderId} 
                          terminalId={orderData.terminals.id} 
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Информация об организации</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Название:</span>{" "}
                        {orderData.organization.name}
                      </p>
                      <p>
                        <span className="font-medium">Терминал:</span>{" "}
                        {orderData.terminals.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 bg-muted rounded-md min-h-[400px] relative">
                  {(orderData.from_lat && orderData.from_lon && orderData.to_lat && orderData.to_lon) ? (
                    <OrderMap 
                      origin={{ lat: orderData.from_lat, lon: orderData.from_lon }}
                      destination={{ lat: orderData.to_lat, lon: orderData.to_lon }}
                      locations={locations || []}
                      isLoading={isLoadingLocations}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Координаты карты недоступны</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="items">
              {/* Order Items Table */}
              {isLoadingItems ? (
                <div className="flex justify-center items-center py-4">
                  <Skeleton className="h-8 w-24" /> {/* Or a more detailed skeleton */}
                  <span className="ml-2">Загрузка товаров...</span>
                </div>
              ) : isErrorItems ? (
                 <div className="text-center text-destructive py-4">Ошибка загрузки товаров.</div>
              ) : orderItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead className="text-right">Количество</TableHead>
                      <TableHead className="text-right">Цена</TableHead>
                      <TableHead className="text-right">Итого</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("ru").format(item.price)}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("ru").format(item.price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">Итоговая стоимость товаров</TableCell>
                      <TableCell className="text-right font-semibold">{new Intl.NumberFormat("ru").format(totalItemsPrice)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">Товары не найдены для этого заказа.</div>
              )}
            </TabsContent>
            <TabsContent value="timeline">
              {/* Order Timeline List */}
              {isLoadingActions ? (
                <div className="flex justify-center items-center py-4">
                  <Skeleton className="h-8 w-24" />
                  <span className="ml-2">Загрузка хронологии...</span>
                </div>
              ) : isErrorActions ? (
                <div className="text-center text-destructive py-4">Ошибка загрузки хронологии.</div>
              ) : orderActions.length > 0 || orderData.created_at ? ( // Show if actions exist OR we have the creation date
                <div className="space-y-6 border-l-2 border-border pl-6 relative py-4">
                  {/* Map through fetched actions (reversed) */} 
                  {orderActions.map((action) => ( // Reverse to show latest first
                    <div key={action.id} className="relative pl-4">
                      {/* Timeline Dot */}
                      <div className="absolute left-[-34px] top-[5px] w-4 h-4 bg-primary rounded-full border-2 border-background"></div>
                      {/* Timeline Content */}
                      <p className="text-sm font-medium mb-1">{action.action_text}</p>
                      <div className="text-xs text-muted-foreground space-x-2">
                        <span>{format(new Date(action.created_at), "PPp")}</span>
                        <span>•</span>
                        <span>Длительность: {formatDuration(action.duration)}</span>
                        {action.users && (
                          <>
                            <span>•</span>
                            <span>Пользователь: {action.users.first_name} {action.users.last_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Adding the initial order creation time at the beginning of the list */} 
                  {(orderData && orderData.created_at) && (
                    <div className="relative pl-4">
                      {/* Timeline Dot for creation */}
                      <div className="absolute left-[-34px] top-[5px] w-4 h-4 bg-muted-foreground rounded-full border-2 border-background"></div>
                      <p className="text-sm font-medium">Заказ создан</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(orderData.created_at), "PPp")}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">Нет данных о хронологии заказа.</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 