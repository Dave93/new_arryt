"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { DateRangePicker } from "../../../components/ui/date-range-picker";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardFooter } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { DateRange } from "react-day-picker";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Badge } from "../../../components/ui/badge";
import { format, startOfWeek, endOfWeek, differenceInMinutes, intervalToDuration } from "date-fns";
import Link from "next/link";
import { Loader2, FileDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IconUser, IconPhone, IconBuildingStore, IconBuilding } from "@tabler/icons-react";
import { sortBy } from "lodash";
import { ru } from "date-fns/locale";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Определяем тип Order
interface Order {
  id: string;
  order_number: string;
  created_at: string;
  order_price: number;
  delivery_price: number;
  payment_type: string;
  delivery_type: string;
  delivery_address: string;
  pre_distance?: number;
  from_lat?: number;
  from_lon?: number;
  finished_date?: string | null;
  cooked_time?: string | null;
  picked_up_time?: string | null;
  bonus?: number;
  order_status: {
    id: string;
    name: string;
    color: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  courier?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  terminal: {
    id: string;
    name: string;
  };
  // Add region if it exists in the Order type from the API
  // region?: {
  //   id: string;
  //   name: string;
  // };
}

// Define types for filter data
interface OrderStatus {
  id: string;
  name: string;
  organization_id?: string; // Optional based on old code
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  // Add other relevant fields if needed, e.g., role
}

// Define Organization and Terminal interfaces instead of using any
interface Organization {
  id: string;
  name: string;
  // Add other fields as needed
}

interface Terminal {
  id: string;
  name: string;
  // Add other fields as needed
}

// Helper function to format duration
const formatDuration = (startDate: string, endDate: string | null | undefined, emptyMessage: string = "N/A"): string => {
  if (!startDate || !endDate) {
    return emptyMessage;
  }
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const minutes = differenceInMinutes(end, start);
    if (minutes < 0) return "Invalid Date";

    const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
    const hours = duration.hours ?? 0;
    const mins = duration.minutes ?? 0;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  } catch (e) {
    console.error("Error formatting duration:", e);
    return "Error";
  }
};

// Определяем колонки для таблицы
const columns: ColumnDef<Order>[] = [
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <OrderDetailSheet orderId={row.original.id} />
      </div>
    ),
    size: 80,
  },
  {
    id: "index",
    header: "#",
    cell: ({ row, table }) => {
      const pageIndex = (table.getState().pagination.pageIndex);
      const pageSize = table.getState().pagination.pageSize;
      return <div>{(pageIndex * pageSize) + row.index + 1}</div>;
    },
    size: 60,
  },
  {
    accessorKey: "order_number",
    header: "Заказ №",
    cell: ({ row }) => (
      <OrderDetailSheet orderId={row.original.id}>
        <Button variant="link" className="p-0 h-auto font-medium">
          {row.getValue("order_number")}
        </Button>
      </OrderDetailSheet>
    ),
    size: 90,
  },
  {
    accessorKey: "created_at",
    header: "Дата",
    cell: ({ row }) => (
      <div>{format(new Date(row.getValue("created_at")), "dd.MM.yy HH:mm", { locale: ru })}</div>
    ),
    size: 110,
  },
  {
    accessorKey: "order_status",
    header: "Статус",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-black px-1.5 py-0.5 font-bold bg-muted-foreground/5"
        style={{ backgroundColor: row.original.order_status.color || '#ccc' }}>
        {row.original.order_status.name}
      </Badge>
    ),
    size: 120,
  },
  {
    accessorKey: "organization.name",
    header: "Организация",
    cell: ({ row }) => (
      <Button variant="link" className="p-0 h-auto text-left whitespace-normal" asChild>
        <Link href={`/dashboard/organizations/${row.original.organization.id}`}>
          <IconBuilding className="h-4 w-4 mr-1 inline-block shrink-0" />
          {row.original.organization.name}
        </Link>
      </Button>
    ),
    size: 120,
  },
  {
    accessorKey: "terminal.name",
    header: "Терминал",
    cell: ({ row }) => (
      <Button variant="link" className="p-0 h-auto text-left whitespace-normal" asChild>
        <Link href={`/dashboard/terminals/${row.original.terminal.id}`}>
          <IconBuildingStore className="h-4 w-4 mr-1 inline-block shrink-0" />
          {row.original.terminal.name}
        </Link>
      </Button>
    ),
    size: 120,
  },
  {
    accessorKey: "courier",
    header: "Курьер",
    cell: ({ row }) => (
      row.original.courier ? (
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href={`/dashboard/users/${row.original.courier.id}`}>
            <IconUser className="h-4 w-4 mr-1 inline-block shrink-0" />
            {`${row.original.courier.first_name} ${row.original.courier.last_name}`}
          </Link>
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">Не назначен</span>
      )
    ),
    size: 120,
  },
  {
    accessorKey: "customer.name",
    header: "Клиент",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Button variant="link" className="p-0 h-auto justify-start" asChild>
          <Link href={`/dashboard/customers/${row.original.customer.id}`}>
            {row.original.customer.name}
          </Link>
        </Button>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "customer.phone",
    header: "Телефон",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <Button variant="link" className="p-0 h-auto text-muted-foreground justify-start" asChild>
          <a href={`tel:${row.original.customer.phone}`}>
            <IconPhone className="h-3 w-3 mr-1 inline-block shrink-0" />
            {row.original.customer.phone}
          </a>
        </Button>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "order_price",
    header: "Цена",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru").format(row.getValue("order_price"))}
      </div>
    ),
    size: 90,
  },
  {
    accessorKey: "cooked_time",
    header: "Время готовки",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.cooked_time ? (
          <div>
            <div>{format(new Date(row.original.cooked_time), "HH:mm", { locale: ru })}</div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(row.original.created_at, row.original.cooked_time)}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
    size: 100,
  },
  {
    id: "cooking_duration",
    header: "Длительность готовки",
    cell: ({ row }) => (
      <div className="text-center">
        {formatDuration(row.original.created_at, row.original.cooked_time, "N/A")}
      </div>
    ),
    size: 100,
  },
  {
    id: "handover_time",
    header: "Время передачи",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.picked_up_time && row.original.cooked_time ? (
          <div>
            <div>{format(new Date(row.original.picked_up_time), "HH:mm", { locale: ru })}</div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(row.original.cooked_time, row.original.picked_up_time)}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
    size: 100,
  },

  {
    id: "handover_duration",
    header: "Длительность передачи",
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.cooked_time && row.original.picked_up_time
          ? formatDuration(row.original.cooked_time, row.original.picked_up_time, "N/A")
          : "N/A"}
      </div>
    ),
    size: 100,
  },
  {
    id: "delivery_duration",
    header: "Delivery Time",
    cell: ({ row }) => (
      <div className="text-center">
        {formatDuration(row.original.created_at, row.original.finished_date, "Not Finished")}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "bonus",
    header: "Bonus",
    cell: ({ row }) => (
      <div className="text-right">
        {new Intl.NumberFormat("ru").format(row.original.bonus || 0)}
      </div>
    ),
    size: 90,
  },
  {
    accessorKey: "pre_distance",
    header: "Distance",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.pre_distance ? `${row.original.pre_distance.toFixed(2)} km` : "N/A"}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "delivery_price",
    header: "Стоимость доставки",
    cell: ({ row }) => (
      <div className="text-right">
        {new Intl.NumberFormat("ru").format(row.getValue("delivery_price"))}
      </div>
    ),
    size: 80,
  },
  {
    accessorKey: "payment_type",
    header: "Способ оплаты",
    cell: ({ row }) => <div>{row.getValue("payment_type")}</div>,
    size: 100,
  },
];

// Define a function to format Excel data
const formatExcelData = (orders: Order[]) => {
  return orders.map(order => ({
    "Номер заказа": order.order_number,
    "Дата создания": format(new Date(order.created_at), "dd.MM.yy HH:mm", { locale: ru }),
    "Статус": order.order_status.name,
    "Организация": order.organization.name,
    "Терминал": order.terminal.name,
    "Курьер": order.courier ? `${order.courier.first_name} ${order.courier.last_name}` : "Не назначен",
    "Клиент": order.customer.name,
    "Телефон клиента": order.customer.phone,
    "Цена заказа": order.order_price,
    "Время готовки": order.cooked_time ? format(new Date(order.cooked_time), "HH:mm", { locale: ru }) : "—",
    "Длительность готовки": formatDuration(order.created_at, order.cooked_time),
    "Время передачи": order.cooked_time && order.picked_up_time ? formatDuration(order.cooked_time, order.picked_up_time) : "N/A",
    "Длительность доставки": formatDuration(order.created_at, order.finished_date),
    "Бонус": order.bonus || 0,
    "Расстояние": order.pre_distance ? `${order.pre_distance.toFixed(2)} км` : "N/A",
    "Стоимость доставки": order.delivery_price,
    "Способ оплаты": order.payment_type,
  }));
};

export default function OrdersPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { from: start, to: end };
  });
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCourierOption, setSelectedCourierOption] = useState<Option | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Filter states
  const [allStatuses, setAllStatuses] = useState<OrderStatus[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("capital");

  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Memoize regionOptions to prevent it from changing on every render
  const regionOptionsData = useMemo(() => [
    { label: "Столица", value: "capital" },
    { label: "Регион", value: "region" }
  ], []);

  // Сброс на первую страницу при изменении фильтров
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [
    dateRange,
    selectedOrganization,
    selectedTerminals,
    searchQuery,
    customerPhone,
    selectedCourierOption,
    selectedStatuses,
    selectedRegionId,
  ]);

  // Загрузка организаций и терминалов только один раз при монтировании
  useEffect(() => {
    // Предотвращаем повторную загрузку
    if (dataLoaded) return;

    const fetchFilterData = async () => {
      try {
        const [orgsResponse, terminalsResponse] = await Promise.all([
          apiClient.api.organizations.cached.get(),
          apiClient.api.terminals.cached.get(),
        ]);

        if (orgsResponse.data && Array.isArray(orgsResponse.data)) {
          setOrganizations(orgsResponse.data);
        }

        if (terminalsResponse.data && Array.isArray(terminalsResponse.data)) {
          setTerminals(sortBy(terminalsResponse.data, 'name'));
        }

        // Помечаем данные как загруженные
        setDataLoaded(true);
      } catch {
        toast.error("Failed to load filter data");
      }
    };

    fetchFilterData();
  }, [dataLoaded]);

  // Fetch Order Statuses
  const { data: orderStatuses = [] } = useQuery<OrderStatus[]>({
    queryKey: ["orderStatuses", selectedOrganization],
    // @ts-ignore
    queryFn: async () => {
      try {
        // Use the cached endpoint as requested
        const response = await apiClient.api.order_status.cached.get({
          // Add query params if needed based on API structure
          // query: { organization_id: selectedOrganization !== 'all' ? selectedOrganization : undefined },
          query: {}
        });
        // Assuming the cached endpoint returns data directly or in a `data` property
        return response.data || response || []; // Adjust based on actual response
      } catch {
        toast.error("Failed to load order statuses");
        return [];
      }
    }
  });

  // Function to fetch couriers for MultipleSelector (onSearch)
  const fetchCouriers = useCallback(async (search: string): Promise<Option[]> => {
    try {
      const response = await apiClient.api.couriers.search.get({
        query: { search: search },
      });
      const usersData = response.data || [];
      return usersData.map((user: User) => ({
        value: user.id,
        label: `${user.first_name} ${user.last_name}`,
      }));
    } catch (err) {
      console.error("Failed to fetch couriers:", err);
      toast.error("Failed to search couriers");
      return [];
    }
  }, []);

  // Fetch statuses for MultiSelect
  useEffect(() => {
    // @ts-ignore
    if (orderStatuses.length > 0 && !filtersLoaded) {
      // @ts-ignore
      setAllStatuses(orderStatuses);
      // Don't pre-select statuses
      // setSelectedStatuses(orderStatuses.map(status => status.id));
      setFiltersLoaded(true);
    }
  }, [orderStatuses, filtersLoaded]);

  const { data: ordersData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: [
      "orders",
      dateRange,
      selectedOrganization,
      selectedTerminals,
      searchQuery,
      customerPhone,
      selectedCourierOption?.value,
      selectedStatuses,
      selectedRegionId,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: async () => {
      try {
        const filters = [];

        // Add date range filter
        if (dateRange?.from) {
          filters.push({
            field: "created_at",
            operator: "gte",
            value: dateRange.from.toISOString(),
          });
        }

        if (dateRange?.to) {
          filters.push({
            field: "created_at",
            operator: "lte",
            value: dateRange.to.toISOString(),
          });
        }

        // Add organization filter
        if (selectedOrganization && selectedOrganization !== "all") {
          filters.push({
            field: "organization_id",
            operator: "eq",
            value: selectedOrganization,
          });
        }

        // Add terminal filter
        if (selectedTerminals.length > 0) {
          filters.push({
            field: "terminal_id",
            operator: "in",
            value: selectedTerminals,
          });
        }

        // Add customer phone filter
        if (customerPhone) {
          filters.push({
            field: "customers.phone",
            operator: "contains",
            value: customerPhone,
          });
        }

        // Add courier filter
        const courierId = selectedCourierOption?.value;
        if (courierId) {
          filters.push({
            field: "courier_id",
            operator: "eq",
            value: courierId,
          });
        }

        // Add order status filter
        if (selectedStatuses.length > 0) {
          filters.push({
            field: "order_status_id",
            operator: "in",
            value: selectedStatuses,
          });
        }

        // Add search filter
        if (searchQuery) {
          filters.push({
            field: "order_number",
            operator: "contains",
            value: searchQuery,
          });
        }

        // Add region filter
        if (selectedRegionId && selectedRegionId !== "all") {
          filters.push({
            field: "terminals.region",
            operator: "eq",
            value: selectedRegionId,
          });
        }

        // Log the filters array being sent to the API
        // console.log("Applying filters:", filters); // Keep commented out or remove

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.orders.get({
          query: {
            fields: ["id",
              "delivery_type",
              "created_at",
              "order_price",
              "order_number",
              "duration",
              "delivery_price",
              "payment_type",
              "finished_date",
              "pre_distance",
              "bonus",
              "cooked_time",
              "picked_up_time",
              "organization.id",
              "organization.name",
              "couriers.id",
              "couriers.first_name",
              "couriers.last_name",
              "customers.id",
              "customers.name",
              "customers.phone",
              "order_status.id",
              "order_status.name",
              "order_status.color",
              "terminals.id",
              "terminals.name"].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
        });

        return {
          total: response.data?.total || 0,
          data: (response.data?.data || []).map((item: Record<string, unknown>) => ({
            id: item.id as string,
            order_number: item.order_number as string,
            created_at: item.created_at as string,
            order_price: item.order_price as number,
            delivery_price: item.delivery_price as number,
            payment_type: item.payment_type as string,
            delivery_type: (item.delivery_type as string) || "",
            delivery_address: (item.delivery_address as string) || "",
            pre_distance: item.pre_distance as number | undefined,
            from_lat: item.from_lat as number | undefined,
            from_lon: item.from_lon as number | undefined,
            order_status: {
              id: (item.order_status as Record<string, unknown>)?.id as string || "",
              name: (item.order_status as Record<string, unknown>)?.name as string || "",
              color: (item.order_status as Record<string, unknown>)?.color as string || "#ccc",
            },
            customer: {
              id: (item.customers as Record<string, unknown>)?.id as string || "",
              name: (item.customers as Record<string, unknown>)?.name as string || "",
              phone: (item.customers as Record<string, unknown>)?.phone as string || "",
            },
            courier: item.couriers ? {
              id: (item.couriers as Record<string, unknown>).id as string,
              first_name: (item.couriers as Record<string, unknown>).first_name as string,
              last_name: (item.couriers as Record<string, unknown>).last_name as string,
            } : undefined,
            organization: {
              id: (item.organization as Record<string, unknown>)?.id as string || "",
              name: (item.organization as Record<string, unknown>)?.name as string || "",
            },
            terminal: {
              id: (item.terminals as Record<string, unknown>)?.id as string || "",
              name: (item.terminals as Record<string, unknown>)?.name as string || "",
            },
            finished_date: item.finished_date as string | null | undefined,
            cooked_time: item.cooked_time as string | null | undefined,
            picked_up_time: item.picked_up_time as string | null | undefined,
            bonus: item.bonus as number | undefined,
          })),
        };
      } catch (err) {
        toast.error("Failed to fetch orders", {
          description: "There was an error loading the orders. Please try again.",
        });
        throw err;
      }
    },
  });

  // Calculate summary data
  const summaryData = useMemo(() => {
    if (!ordersData.data || ordersData.data.length === 0) {
      return null;
    }

    const pageData = ordersData.data;

    const totalDeliveryPrice = pageData.reduce(
      (sum: number, record: Order) => sum + (record.delivery_price || 0),
      0
    );
    const totalBonus = pageData.reduce(
      (sum: number, record: Order) => sum + (record.bonus || 0),
      0
    );
    const totalDistance = pageData.reduce(
      (sum: number, record: Order) => sum + (record.pre_distance || 0),
      0
    );

    let totalCookedMinutes = 0;
    let cookedOrdersCount = 0;
    let totalDeliveryMinutes = 0;
    let deliveredOrdersCount = 0;

    pageData.forEach((record: Order) => {
      if (record.cooked_time && record.created_at) {
        try {
          const cookedMins = differenceInMinutes(new Date(record.cooked_time), new Date(record.created_at));
          if (cookedMins >= 0) {
            totalCookedMinutes += cookedMins;
            cookedOrdersCount++;
          }
        } catch { }
      }
      if (record.finished_date && record.created_at) {
        try {
          const deliveryMins = differenceInMinutes(new Date(record.finished_date), new Date(record.created_at));
          if (deliveryMins >= 0) {
            totalDeliveryMinutes += deliveryMins;
            deliveredOrdersCount++;
          }
        } catch { }
      }
    });

    const avgCookedMinutes = cookedOrdersCount > 0 ? totalCookedMinutes / cookedOrdersCount : 0;
    const avgDeliveryMinutes = deliveredOrdersCount > 0 ? totalDeliveryMinutes / deliveredOrdersCount : 0;

    const formatAvgDuration = (minutes: number): string => {
      if (minutes <= 0) return "00:00";
      const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
      const hours = duration.hours ?? 0;
      const mins = duration.minutes ?? 0;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    return {
      totalDeliveryPrice,
      totalBonus,
      totalDistance,
      avgCookingTime: formatAvgDuration(avgCookedMinutes),
      avgDeliveryTime: formatAvgDuration(avgDeliveryMinutes),
    };

  }, [ordersData.data]);

  // --- Helper functions to format data for MultipleSelector ---

  // Format organizations for MultipleSelector options
  const organizationOptions = useMemo((): Option[] => {
    const options = organizations.map(org => ({ value: org.id, label: org.name }));
    return [{ value: "all", label: "Все организации" }, ...options];
  }, [organizations]);

  // Format terminals for MultipleSelector options
  const terminalOptions = useMemo((): Option[] => {
    return terminals.map(terminal => ({ value: terminal.id, label: terminal.name }));
  }, [terminals]);

  // Format statuses for MultipleSelector options
  const statusOptions = useMemo((): Option[] => {
    return allStatuses.map(status => ({ value: status.id, label: status.name }));
  }, [allStatuses]);

  // Format regions for MultipleSelector options
  const regionSelectorOptions = useMemo((): Option[] => {
    const options = regionOptionsData.map(region => ({ value: region.value, label: region.label }));
    return [{ value: "all", label: "Все регионы" }, ...options];
  }, [regionOptionsData]);

  // Get selected organization Option object for the value prop
  const selectedOrganizationOption = useMemo((): Option[] => {
    if (selectedOrganization === "all") return [];
    const org = organizations.find(o => o.id === selectedOrganization);
    return org ? [{ value: org.id, label: org.name }] : [];
  }, [selectedOrganization, organizations]);

  // Get selected terminal Option objects for the value prop
  const selectedTerminalOptions = useMemo((): Option[] => {
    return selectedTerminals
      .map(id => terminals.find(t => t.id === id))
      .filter((terminal): terminal is Terminal => !!terminal)
      .map(terminal => ({ value: terminal.id, label: terminal.name }));
  }, [selectedTerminals, terminals]);

  // Get selected status Option objects for the value prop
  const selectedStatusOptions = useMemo((): Option[] => {
    return selectedStatuses
      .map(id => allStatuses.find(status => status.id === id))
      .filter((status): status is OrderStatus => !!status) // Type guard and filter out nulls
      .map(status => ({ value: status.id, label: status.name }));
  }, [selectedStatuses, allStatuses]);

  // Get selected region Option object for the value prop
  const selectedRegionOption = useMemo((): Option[] => {
    if (selectedRegionId === "all") return [];
    const region = regionOptionsData.find(r => r.value === selectedRegionId);
    return region ? [{ value: region.value, label: region.label }] : [];
  }, [selectedRegionId, regionOptionsData]);

  // Remove unused debounced functions

  const [isExporting, setIsExporting] = useState(false);

  // Function to export all orders to Excel
  const exportToExcel = async () => {

    setIsExporting(true);
    toast.info("Начинаем экспорт данных");

    try {
      const filters = [];

      // Add date range filter
      if (dateRange?.from) {
        filters.push({
          field: "created_at",
          operator: "gte",
          value: dateRange.from.toISOString(),
        });
      }

      if (dateRange?.to) {
        filters.push({
          field: "created_at",
          operator: "lte",
          value: dateRange.to.toISOString(),
        });
      }

      // Add organization filter
      if (selectedOrganization && selectedOrganization !== "all") {
        filters.push({
          field: "organization_id",
          operator: "eq",
          value: selectedOrganization,
        });
      }

      // Add terminal filter
      if (selectedTerminals.length > 0) {
        filters.push({
          field: "terminal_id",
          operator: "in",
          value: selectedTerminals,
        });
      }

      // Add customer phone filter
      if (customerPhone) {
        filters.push({
          field: "customers.phone",
          operator: "contains",
          value: customerPhone,
        });
      }

      // Add courier filter
      const courierId = selectedCourierOption?.value;
      if (courierId) {
        filters.push({
          field: "courier_id",
          operator: "eq",
          value: courierId,
        });
      }

      // Add order status filter
      if (selectedStatuses.length > 0) {
        filters.push({
          field: "order_status_id",
          operator: "in",
          value: selectedStatuses,
        });
      }

      // Add search filter
      if (searchQuery) {
        filters.push({
          field: "order_number",
          operator: "contains",
          value: searchQuery,
        });
      }

      // Add region filter
      if (selectedRegionId && selectedRegionId !== "all") {
        filters.push({
          field: "terminals.region",
          operator: "eq",
          value: selectedRegionId,
        });
      }

      // Make the API call with the ext_all=1 parameter to get all orders
      const response = await apiClient.api.orders.get({
        query: {
          fields: ["id",
            "delivery_type",
            "created_at",
            "order_price",
            "order_number",
            "duration",
            "delivery_price",
            "payment_type",
            "finished_date",
            "pre_distance",
            "bonus",
            "cooked_time",
            "picked_up_time",
            "organization.id",
            "organization.name",
            "couriers.id",
            "couriers.first_name",
            "couriers.last_name",
            "customers.id",
            "customers.name",
            "customers.phone",
            "order_status.id",
            "order_status.name",
            "order_status.color",
            "terminals.id",
            "terminals.name"].join(","),
          filters: JSON.stringify(filters),
          ext_all: "1", // Request all data without pagination
          limit: "999999", // Large number to get all records
          offset: "0", // Start from the first record
        } as any, // Type assertion to avoid the TypeScript error
      });

      // Process the data
      const orders = (response.data?.data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        order_number: item.order_number as string,
        created_at: item.created_at as string,
        order_price: item.order_price as number,
        delivery_price: item.delivery_price as number,
        payment_type: item.payment_type as string,
        delivery_type: (item.delivery_type as string) || "",
        delivery_address: (item.delivery_address as string) || "",
        pre_distance: item.pre_distance as number | undefined,
        from_lat: item.from_lat as number | undefined,
        from_lon: item.from_lon as number | undefined,
        order_status: {
          id: (item.order_status as Record<string, unknown>)?.id as string || "",
          name: (item.order_status as Record<string, unknown>)?.name as string || "",
          color: (item.order_status as Record<string, unknown>)?.color as string || "#ccc",
        },
        customer: {
          id: (item.customers as Record<string, unknown>)?.id as string || "",
          name: (item.customers as Record<string, unknown>)?.name as string || "",
          phone: (item.customers as Record<string, unknown>)?.phone as string || "",
        },
        courier: item.couriers ? {
          id: (item.couriers as Record<string, unknown>).id as string,
          first_name: (item.couriers as Record<string, unknown>).first_name as string,
          last_name: (item.couriers as Record<string, unknown>).last_name as string,
        } : undefined,
        organization: {
          id: (item.organization as Record<string, unknown>)?.id as string || "",
          name: (item.organization as Record<string, unknown>)?.name as string || "",
        },
        terminal: {
          id: (item.terminals as Record<string, unknown>)?.id as string || "",
          name: (item.terminals as Record<string, unknown>)?.name as string || "",
        },
        finished_date: item.finished_date as string | null | undefined,
        cooked_time: item.cooked_time as string | null | undefined,
        picked_up_time: item.picked_up_time as string | null | undefined,
        bonus: item.bonus as number | undefined,
      }));

      // Create Excel worksheet
      const worksheet = XLSX.utils.json_to_sheet(formatExcelData(orders));

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Заказы");

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: "application/octet-stream" });

      // Create filename with current date
      const fileName = `Заказы_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

      // Save the file
      saveAs(data, fileName);

      toast.success("Экспорт выполнен успешно", {
        description: `Экспортировано ${orders.length} заказов`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Ошибка при экспорте данных", {
        description: "Попробуйте повторить позже или обратитесь к администратору",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы</h1>

      </div>

      <Card className="gap-2">
        <CardContent className="p-0">
          <div className="sticky top-0 bg-background z-20 p-6 pb-4 border-b flex flex-row items-end justify-between gap-2">
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-4">
              <DateRangePicker
                value={dateRange}
                onChange={(value: DateRange | undefined) => setDateRange(value)}
                className="w-auto col-span-3 xl:col-span-2"
                timePicker={true}
              />
              <Input
                placeholder="Поиск заказов..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-auto"
              />
              <Input
                placeholder="Телефон клиента..."
                value={customerPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                className="w-auto"
              />
              <MultipleSelector
                value={selectedOrganizationOption}
                onChange={(options) => setSelectedOrganization(options[0]?.value ?? "all")}
                options={organizationOptions}
                placeholder="Выберите организацию"
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-auto"
                commandProps={{
                  label: "Выберите организацию",
                }}
                selectFirstItem={false}
              />
              <MultipleSelector
                value={selectedTerminalOptions}
                onChange={(options) => setSelectedTerminals(options.map(opt => opt.value))}
                options={terminalOptions}
                placeholder="Выберите терминалы..."
                className="w-auto"
                emptyIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    Терминалы не найдены.
                  </div>
                }
                commandProps={{
                  label: "Выберите терминалы",
                }}
                selectFirstItem={false}
              />
              <MultipleSelector
                value={selectedCourierOption ? [selectedCourierOption] : []}
                onChange={(options) => setSelectedCourierOption(options[0] ?? null)}
                onSearch={fetchCouriers}
                placeholder="Поиск курьера..."
                loadingIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Загрузка курьеров...
                  </div>
                }
                emptyIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    Курьеры не найдены.
                  </div>
                }
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-auto"
                triggerSearchOnFocus
                delay={300}
                commandProps={{
                  label: "Поиск курьера",
                }}
                selectFirstItem={false}
              />
              <MultipleSelector
                value={selectedStatusOptions}
                onChange={(options) => setSelectedStatuses(options.map(opt => opt.value))}
                options={statusOptions}
                placeholder="Выберите статусы..."
                className="w-auto"
                emptyIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    Статусы не найдены.
                  </div>
                }
                commandProps={{
                  label: "Выберите статусы",
                }}
                selectFirstItem={false}
              />
              <MultipleSelector
                value={selectedRegionOption}
                onChange={(options) => setSelectedRegionId(options[0]?.value ?? "all")}
                defaultOptions={regionSelectorOptions}
                placeholder="Выберите регион"
                maxSelected={1}
                hidePlaceholderWhenSelected
                className="w-auto"
                commandProps={{
                  label: "Выберите регион",
                }}
                selectFirstItem={false}
              />
            </div>
            <Button
              onClick={exportToExcel}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isExporting ? "Экспорт..." : "Экспорт в Excel"}
            </Button>
          </div>
          <div className="p-6 pt-4">
            <DataTable
              columns={columns}
              data={ordersData.data}
              loading={isLoading}
              pageCount={Math.ceil(ordersData.total / pagination.pageSize)}
              pagination={pagination}
              onPaginationChange={setPagination}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </CardContent>
        {/* Add CardFooter for summary here */}
        {summaryData && (
          <CardFooter className="flex justify-end space-x-6 border-t pt-2 text-sm font-medium">
            <div className="text-right">
              Ср. время готовки: <span className="font-bold">{summaryData.avgCookingTime}</span>
            </div>
            <div className="text-right">
              Ср. время доставки: <span className="font-bold">{summaryData.avgDeliveryTime}</span>
            </div>
            <div className="text-right">
              Сумма бонусов: <span className="font-bold">{new Intl.NumberFormat("ru").format(summaryData.totalBonus)}</span>
            </div>
            <div className="text-right">
              Общая дистанция: <span className="font-bold">{summaryData.totalDistance.toFixed(2)} км</span>
            </div>
            <div className="text-right">
              Стоимость доставки: <span className="font-bold">{new Intl.NumberFormat("ru").format(summaryData.totalDeliveryPrice)}</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 