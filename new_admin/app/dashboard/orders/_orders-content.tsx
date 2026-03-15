"use client";

import { useState, useMemo } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef, PaginationState, OnChangeFn } from "@tanstack/react-table";
import { Badge } from "../../../components/ui/badge";
import {
  format,
  differenceInMinutes,
  intervalToDuration,
} from "date-fns";
import Link from "next/link";
import { Loader2, FileDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  IconUser,
  IconPhone,
  IconBuildingStore,
  IconBuilding,
} from "@tabler/icons-react";
import { ru } from "date-fns/locale";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelectedOrdersStore } from "@/lib/selected-orders-store";
import { OrdersSelectionToolbar } from "@/components/orders/orders-selection-toolbar";
import { PageTitle } from "@/components/page-title";

import { useOrderFilters } from "./_filters/use-order-filters";
import { DateRangeFilter } from "./_filters/date-range-filter";
import { SearchFilter } from "./_filters/search-filter";
import { PhoneFilter } from "./_filters/phone-filter";
import { OrganizationFilter } from "./_filters/organization-filter";
import { TerminalsFilter } from "./_filters/terminals-filter";
import { CourierFilter } from "./_filters/courier-filter";
import { StatusesFilter } from "./_filters/statuses-filter";
import { RegionFilter } from "./_filters/region-filter";

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
}

// Helper function to format duration
function formatDuration(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  fallback: string = "—",
): string {
  if (!startDate || !endDate) return fallback;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalMinutes = differenceInMinutes(end, start);
    if (totalMinutes < 0) return fallback;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } catch {
    return fallback;
  }
}

// Define columns for the orders table
const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: () => null,
    cell: ({ row }) => {
      const OrdersPageSelectCell = ({
        orderId,
        organizationId,
      }: {
        orderId: string;
        organizationId: string;
      }) => {
        const { selectedOrderIds, toggleOrder, canSelectOrder } =
          useSelectedOrdersStore();
        const isSelected = selectedOrderIds.has(orderId);
        const canSelect = canSelectOrder(organizationId);

        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleOrder(orderId, organizationId)}
            disabled={!canSelect && !isSelected}
            aria-label="Выбрать строку"
          />
        );
      };
      return (
        <OrdersPageSelectCell
          orderId={row.original.id}
          organizationId={row.original.organization.id}
        />
      );
    },
    size: 50,
  },
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
      const pageIndex = table.getState().pagination.pageIndex;
      const pageSize = table.getState().pagination.pageSize;
      return <div>{pageIndex * pageSize + row.index + 1}</div>;
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
      <div>
        {format(new Date(row.getValue("created_at")), "dd.MM.yy HH:mm", {
          locale: ru,
        })}
      </div>
    ),
    size: 110,
  },
  {
    accessorKey: "order_status",
    header: "Статус",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-black px-1.5 py-0.5 font-bold bg-muted-foreground/5"
        style={{ backgroundColor: row.original.order_status.color || "#ccc" }}>
        {row.original.order_status.name}
      </Badge>
    ),
    size: 120,
  },
  {
    accessorKey: "organization.name",
    header: "Организация",
    cell: ({ row }) => (
      <Button
        variant="link"
        className="p-0 h-auto text-left whitespace-normal"
        asChild>
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
      <Button
        variant="link"
        className="p-0 h-auto text-left whitespace-normal"
        asChild>
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
    cell: ({ row }) =>
      row.original.courier ? (
        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href={`/dashboard/users/${row.original.courier.id}`}>
            <IconUser className="h-4 w-4 mr-1 inline-block shrink-0" />
            {`${row.original.courier.first_name} ${row.original.courier.last_name}`}
          </Link>
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">Не назначен</span>
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
        <Button
          variant="link"
          className="p-0 h-auto text-muted-foreground justify-start"
          asChild>
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
            <div>
              {format(new Date(row.original.cooked_time), "HH:mm", {
                locale: ru,
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(
                row.original.created_at,
                row.original.cooked_time,
              )}
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
        {formatDuration(
          row.original.created_at,
          row.original.cooked_time,
          "N/A",
        )}
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
            <div>
              {format(new Date(row.original.picked_up_time), "HH:mm", {
                locale: ru,
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(
                row.original.cooked_time,
                row.original.picked_up_time,
              )}
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
          ? formatDuration(
              row.original.cooked_time,
              row.original.picked_up_time,
              "N/A",
            )
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
        {formatDuration(
          row.original.created_at,
          row.original.finished_date,
          "Not Finished",
        )}
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
      <div className="text-right text-primary font-semibold">
        {row.original.pre_distance
          ? `${row.original.pre_distance.toFixed(2)} km`
          : "N/A"}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "delivery_price",
    header: "Стоимость доставки",
    cell: ({ row }) => (
      <div className="text-right text-primary font-semibold">
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
  return orders.map((order) => ({
    "Номер заказа": order.order_number,
    "Дата создания": format(new Date(order.created_at), "dd.MM.yy HH:mm", {
      locale: ru,
    }),
    Статус: order.order_status.name,
    Организация: order.organization.name,
    Терминал: order.terminal.name,
    Курьер: order.courier
      ? `${order.courier.first_name} ${order.courier.last_name}`
      : "Не назначен",
    Клиент: order.customer.name,
    "Телефон клиента": order.customer.phone,
    "Цена заказа": order.order_price,
    "Время готовки": order.cooked_time
      ? format(new Date(order.cooked_time), "HH:mm", { locale: ru })
      : "—",
    "Длительность готовки": formatDuration(order.created_at, order.cooked_time),
    "Время передачи":
      order.cooked_time && order.picked_up_time
        ? formatDuration(order.cooked_time, order.picked_up_time)
        : "N/A",
    "Длительность доставки": formatDuration(
      order.created_at,
      order.finished_date,
    ),
    Бонус: order.bonus || 0,
    Расстояние: order.pre_distance
      ? `${order.pre_distance.toFixed(2)} км`
      : "N/A",
    "Стоимость доставки": order.delivery_price,
    "Способ оплаты": order.payment_type,
  }));
};

function buildFilters(filters: {
  dateFrom: Date;
  dateTo: Date;
  search: string;
  phone: string;
  organization: string;
  terminals: string[];
  courierId: string;
  statuses: string[];
  region: string;
}) {
  const result: { field: string; operator: string; value: string | string[] }[] = [];

  if (filters.dateFrom) {
    result.push({
      field: "created_at",
      operator: "gte",
      value: filters.dateFrom.toISOString(),
    });
  }
  if (filters.dateTo) {
    result.push({
      field: "created_at",
      operator: "lte",
      value: filters.dateTo.toISOString(),
    });
  }
  if (filters.organization && filters.organization !== "all") {
    result.push({
      field: "organization_id",
      operator: "eq",
      value: filters.organization,
    });
  }
  if (filters.terminals.length > 0) {
    result.push({
      field: "terminal_id",
      operator: "in",
      value: filters.terminals,
    });
  }
  if (filters.phone) {
    result.push({
      field: "customers.phone",
      operator: "contains",
      value: filters.phone,
    });
  }
  if (filters.courierId) {
    result.push({
      field: "courier_id",
      operator: "eq",
      value: filters.courierId,
    });
  }
  if (filters.statuses.length > 0) {
    result.push({
      field: "order_status_id",
      operator: "in",
      value: filters.statuses,
    });
  }
  if (filters.search) {
    result.push({
      field: "order_number",
      operator: "contains",
      value: filters.search,
    });
  }
  if (filters.region && filters.region !== "all") {
    result.push({
      field: "terminals.region",
      operator: "eq",
      value: filters.region,
    });
  }

  return result;
}

const ORDER_FIELDS = [
  "id",
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
  "terminals.name",
].join(",");

function mapOrderItem(item: Record<string, unknown>): Order {
  return {
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
      id:
        ((item.order_status as Record<string, unknown>)?.id as string) || "",
      name:
        ((item.order_status as Record<string, unknown>)?.name as string) || "",
      color:
        ((item.order_status as Record<string, unknown>)?.color as string) ||
        "#ccc",
    },
    customer: {
      id: ((item.customers as Record<string, unknown>)?.id as string) || "",
      name:
        ((item.customers as Record<string, unknown>)?.name as string) || "",
      phone:
        ((item.customers as Record<string, unknown>)?.phone as string) || "",
    },
    courier: item.couriers
      ? {
          id: (item.couriers as Record<string, unknown>).id as string,
          first_name: (item.couriers as Record<string, unknown>)
            .first_name as string,
          last_name: (item.couriers as Record<string, unknown>)
            .last_name as string,
        }
      : undefined,
    organization: {
      id:
        ((item.organization as Record<string, unknown>)?.id as string) || "",
      name:
        ((item.organization as Record<string, unknown>)?.name as string) || "",
    },
    terminal: {
      id: ((item.terminals as Record<string, unknown>)?.id as string) || "",
      name:
        ((item.terminals as Record<string, unknown>)?.name as string) || "",
    },
    finished_date: item.finished_date as string | null | undefined,
    cooked_time: item.cooked_time as string | null | undefined,
    picked_up_time: item.picked_up_time as string | null | undefined,
    bonus: item.bonus as number | undefined,
  };
}

export function OrdersContent() {
  const {
    clearSelection,
    toggleOrder,
    canSelectOrder,
    selectAllFromOrganization,
    getSelectedOrganizationId,
  } = useSelectedOrdersStore();

  const [filters, setFilters] = useOrderFilters();
  const { page, pageSize, ...filterValues } = filters;

  const pagination: PaginationState = { pageIndex: page, pageSize };

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next =
      typeof updater === "function" ? updater(pagination) : updater;
    setFilters({ page: next.pageIndex, pageSize: next.pageSize });
  };

  // Reset to page 0 when filter values change — handled by nuqs URL sync

  const { data: ordersData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: [
      "orders",
      filterValues.dateFrom?.toISOString(),
      filterValues.dateTo?.toISOString(),
      filterValues.organization,
      filterValues.terminals,
      filterValues.search,
      filterValues.phone,
      filterValues.courierId,
      filterValues.statuses,
      filterValues.region,
      page,
      pageSize,
    ],
    queryFn: async () => {
      try {
        const apiFilters = buildFilters(filterValues);
        const offset = page * pageSize;

        const response = await apiClient.api.orders.get({
          query: {
            fields: ORDER_FIELDS,
            limit: pageSize.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(apiFilters),
          },
        });

        return {
          total: response.data?.total || 0,
          data: (response.data?.data || []).map(
            (item: Record<string, unknown>) => mapOrderItem(item),
          ),
        };
      } catch (err) {
        toast.error("Ошибка загрузки заказов");
        throw err;
      }
    },
  });

  // Calculate summary data
  const summaryData = useMemo(() => {
    if (!ordersData.data || ordersData.data.length === 0) return null;

    const pageData = ordersData.data;

    const totalDeliveryPrice = pageData.reduce(
      (sum: number, r: Order) => sum + (r.delivery_price || 0),
      0,
    );
    const totalBonus = pageData.reduce(
      (sum: number, r: Order) => sum + (r.bonus || 0),
      0,
    );
    const totalDistance = pageData.reduce(
      (sum: number, r: Order) => sum + (r.pre_distance || 0),
      0,
    );

    let totalCookedMinutes = 0;
    let cookedCount = 0;
    let totalDeliveryMinutes = 0;
    let deliveredCount = 0;

    pageData.forEach((r: Order) => {
      if (r.cooked_time && r.created_at) {
        try {
          const mins = differenceInMinutes(
            new Date(r.cooked_time),
            new Date(r.created_at),
          );
          if (mins >= 0) {
            totalCookedMinutes += mins;
            cookedCount++;
          }
        } catch {}
      }
      if (r.finished_date && r.created_at) {
        try {
          const mins = differenceInMinutes(
            new Date(r.finished_date),
            new Date(r.created_at),
          );
          if (mins >= 0) {
            totalDeliveryMinutes += mins;
            deliveredCount++;
          }
        } catch {}
      }
    });

    const avgCookedMins = cookedCount > 0 ? totalCookedMinutes / cookedCount : 0;
    const avgDeliveryMins =
      deliveredCount > 0 ? totalDeliveryMinutes / deliveredCount : 0;

    const fmtAvg = (minutes: number): string => {
      if (minutes <= 0) return "00:00";
      const d = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
      return `${String(d.hours ?? 0).padStart(2, "0")}:${String(d.minutes ?? 0).padStart(2, "0")}`;
    };

    return {
      totalDeliveryPrice,
      totalBonus,
      totalDistance,
      avgCookingTime: fmtAvg(avgCookedMins),
      avgDeliveryTime: fmtAvg(avgDeliveryMins),
    };
  }, [ordersData.data]);

  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    toast.info("Начинаем экспорт данных");

    try {
      const apiFilters = buildFilters(filterValues);

      const response = await apiClient.api.orders.get({
        query: {
          fields: ORDER_FIELDS,
          filters: JSON.stringify(apiFilters),
          ext_all: "1",
          limit: "999999",
          offset: "0",
        } as any,
      });

      const orders = (response.data?.data || []).map(
        (item: Record<string, unknown>) => mapOrderItem(item),
      );

      const [XLSX, { saveAs }] = await Promise.all([
        import("xlsx"),
        import("file-saver"),
      ]);
      const worksheet = XLSX.utils.json_to_sheet(formatExcelData(orders));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Заказы");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const data = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(data, `Заказы_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast.success("Экспорт выполнен успешно", {
        description: `Экспортировано ${orders.length} заказов`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Ошибка при экспорте данных");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAll = () => {
    const organizationId = getSelectedOrganizationId();
    if (!organizationId) return;

    const ordersFromSameOrg = ordersData.data
      .filter((order: Order) => order.organization.id === organizationId)
      .map((order: Order) => order.id);

    selectAllFromOrganization(ordersFromSameOrg, organizationId);
  };

  const exportButton = (
    <Button
      onClick={exportToExcel}
      disabled={isExporting}
      size="sm"
      className="gap-2">
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {isExporting ? "Экспорт..." : "Экспорт в Excel"}
    </Button>
  );

  return (
    <>
      <PageTitle title="Заказы" actions={exportButton} />
      <OrdersSelectionToolbar onSelectAll={handleSelectAll} />
      <div className="flex flex-col gap-1">
        <div className="sticky top-0 bg-background z-20 px-4 py-2 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <DateRangeFilter />
            <SearchFilter />
            <PhoneFilter />
            <OrganizationFilter />
            <TerminalsFilter />
            <CourierFilter />
            <StatusesFilter />
            <RegionFilter />
          </div>
        </div>
        <div className="px-4 py-1">
          <DataTable
                columns={columns}
                data={ordersData.data}
                loading={isLoading}
                pageCount={Math.ceil(ordersData.total / pageSize)}
                pagination={pagination}
                onPaginationChange={onPaginationChange}
                pageSizeOptions={[10, 20, 50, 100, 200, 300, 400, 500]}
                onRowClick={(order) => {
                  if (canSelectOrder(order.organization.id)) {
                    toggleOrder(order.id, order.organization.id);
                  }
                }}
                isRowDisabled={(order) =>
                  !canSelectOrder(order.organization.id)
                }
                footerContent={
                  summaryData ? (
                    <tr className="text-sm font-bold">
                      {/* select */}
                      <td className="p-3" />
                      {/* actions */}
                      <td className="p-3" />
                      {/* index */}
                      <td className="p-3" />
                      {/* order_number */}
                      <td className="p-3">Итого</td>
                      {/* created_at */}
                      <td className="p-3" />
                      {/* order_status */}
                      <td className="p-3" />
                      {/* organization */}
                      <td className="p-3" />
                      {/* terminal */}
                      <td className="p-3" />
                      {/* courier */}
                      <td className="p-3" />
                      {/* customer */}
                      <td className="p-3" />
                      {/* phone */}
                      <td className="p-3" />
                      {/* order_price */}
                      <td className="p-3" />
                      {/* cooked_time — Ср. время готовки */}
                      <td className="p-3 text-right">
                        {summaryData.avgCookingTime}
                      </td>
                      {/* cooking_duration */}
                      <td className="p-3" />
                      {/* handover_time */}
                      <td className="p-3" />
                      {/* handover_duration */}
                      <td className="p-3" />
                      {/* delivery_duration — Ср. время доставки */}
                      <td className="p-3 text-center">
                        {summaryData.avgDeliveryTime}
                      </td>
                      {/* bonus — Сумма бонусов */}
                      <td className="p-3 text-right">
                        {new Intl.NumberFormat("ru").format(
                          summaryData.totalBonus,
                        )}
                      </td>
                      {/* distance — Общая дистанция */}
                      <td className="p-3 text-right">
                        {summaryData.totalDistance.toFixed(2)} км
                      </td>
                      {/* delivery_price — Стоимость доставки */}
                      <td className="p-3 text-right">
                        {new Intl.NumberFormat("ru").format(
                          summaryData.totalDeliveryPrice,
                        )}
                      </td>
                      {/* payment_type */}
                      <td className="p-3" />
                    </tr>
                  ) : undefined
                }
              />
        </div>
      </div>
    </>
  );
}
