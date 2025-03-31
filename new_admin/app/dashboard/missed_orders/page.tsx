"use client";

import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "@/lib/eden-client";
import { DateRange } from "react-day-picker";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { format, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { Eye, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  IconBuildingStore
} from "@tabler/icons-react";
import { sortBy } from "lodash";
import { ru } from "date-fns/locale";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
import { SendOrderToYandex } from "@/components/orders/send-to-yandex";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";

// Define MissedOrder interface
interface MissedOrder {
  id: string;
  created_at: string;
  order_number: string;
  pre_distance?: number;
  order_price: number;
  payment_type: string;
  courier_id?: string;
  order_status: {
    id: string;
    name: string;
    color: string;
  };
  terminals: {
    id: string;
    name: string;
    region?: string;
  };
}

// Define Terminal interface
interface Terminal {
  id: string;
  name: string;
  region?: string;
}

// Define columns for the table
const columns: ColumnDef<MissedOrder>[] = [
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
    accessorKey: "created_at",
    header: "Дата заказа",
    cell: ({ row }) => (
      <div>{format(new Date(row.getValue("created_at")), "dd.MM.yy HH:mm", { locale: ru })}</div>
    ),
    size: 120,
  },
  {
    accessorKey: "order_number",
    header: "Заказ №",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Button variant="link" className="p-0 h-auto font-medium" asChild>
          <Link href={`/dashboard/orders/${row.original.id}`}>
            {row.getValue("order_number")}
          </Link>
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
          <Link href={`/dashboard/orders/${row.original.id}`} target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "terminals.name",
    header: "Терминал",
    cell: ({ row }) => (
      <Button variant="link" className="p-0 h-auto text-left" asChild>
        <Link href={`/dashboard/terminals/${row.original.terminals.id}`}>
          <IconBuildingStore className="h-4 w-4 mr-1 inline-block shrink-0" />
          {row.original.terminals.name}
        </Link>
      </Button>
    ),
    size: 200,
  },
  {
    id: "yandex",
    header: "Отправить в Яндекс",
    cell: ({ row }) => (
      <div className="flex flex-col gap-2">
        <SendOrderToYandex order={row.original} />
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "pre_distance",
    header: "Дистанция",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.pre_distance ? `${row.original.pre_distance.toFixed(2)} км` : "Н/Д"}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "order_price",
    header: "Стоимость заказа",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat("ru").format(row.getValue("order_price"))}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "payment_type",
    header: "Способ оплаты",
    cell: ({ row }) => <div>{row.getValue("payment_type")}</div>,
    size: 120,
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
];

export default function MissedOrdersPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { 
      from: startOfDay(now), 
      to: endOfDay(now) 
    };
  });
  
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("capital");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [needAction, setNeedAction] = useState<boolean>(false);
  const [terminalsList, setTerminalsList] = useState<Terminal[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const authHeaders = useGetAuthHeaders();
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch terminals for the filter
  useEffect(() => {
    if (dataLoaded || !authHeaders.Authorization) return;

    const fetchTerminals = async () => {
      try {
        const response = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });

        if (response.data && Array.isArray(response.data)) {
          setTerminalsList(sortBy(response.data, "name"));
        }
        
        setDataLoaded(true);
      } catch {
        toast.error("Failed to load terminals data");
      }
    };

    fetchTerminals();
  }, [JSON.stringify(authHeaders), dataLoaded]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [
    dateRange,
    selectedTerminals,
    selectedRegion,
    orderNumber,
    needAction
  ]);

  // Region options
  const regionOptions: Option[] = [
    { value: "all", label: "Все регионы" },
    { value: "capital", label: "Столица" },
    { value: "region", label: "Регион" }
  ];

  // Selected region option
  const selectedRegionOption = useMemo((): Option[] => {
    if (selectedRegion === "all") return [];
    const region = regionOptions.find(r => r.value === selectedRegion);
    return region ? [region] : [];
  }, [selectedRegion]);

  // Terminal options
  const terminalOptions = useMemo((): Option[] => {
    return terminalsList.map(terminal => ({ 
      value: terminal.id, 
      label: terminal.name 
    }));
  }, [terminalsList]);

  // Selected terminal options
  const selectedTerminalOptions = useMemo((): Option[] => {
    return selectedTerminals
      .map(id => terminalsList.find(terminal => terminal.id === id))
      .filter((terminal): terminal is Terminal => !!terminal)
      .map(terminal => ({ 
        value: terminal.id, 
        label: terminal.name 
      }));
  }, [selectedTerminals, terminalsList]);

  // Query for missed orders
  const { data: missedOrdersData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: [
      "missed_orders",
      dateRange,
      selectedTerminals,
      selectedRegion,
      orderNumber,
      needAction,
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

        // Add terminal filter
        if (selectedTerminals.length > 0) {
          filters.push({
            field: "terminal_id",
            operator: "in",
            value: selectedTerminals,
          });
        }

        // Add region filter
        if (selectedRegion && selectedRegion !== "all") {
          filters.push({
            field: "terminals.region",
            operator: "eq",
            value: selectedRegion,
          });
        }

        // Add order number filter
        if (orderNumber) {
          filters.push({
            field: "order_number",
            operator: "eq",
            value: parseInt(orderNumber),
          });
        }

        // Add need action filter (new status)
        if (needAction) {
          filters.push({
            field: "order_status_id",
            operator: "eq",
            value: { equals: "new" },
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.missed_orders.index.get({
          query: {
            fields: [
              "id",
              "created_at",
              "order_status.id",
              "order_status.name",
              "order_status.color",
              "courier_id",
              "order_number",
              "pre_distance",
              "order_price",
              "payment_type",
              "terminals.id",
              "terminals.name",
              "terminals.region"
            ].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
          headers: authHeaders,
        });

        return {
          total: response.data?.total || 0,
          data: response.data?.data || [],
        };
      } catch (error) {
        toast.error("Failed to fetch missed orders");
        throw error;
      }
    },
    refetchInterval: 1000 * 5, // Refresh every 5 seconds like in the original
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пропущенные заказы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              className="w-auto min-w-[300px]"
            />
            
            <MultipleSelector
              value={selectedRegionOption}
              onChange={(options) => setSelectedRegion(options[0]?.value ?? "all")}
              defaultOptions={regionOptions}
              placeholder="Выберите регион"
              maxSelected={1}
              hidePlaceholderWhenSelected
              className="w-auto"
              commandProps={{
                label: "Выберите регион",
              }}
              selectFirstItem={false}
            />
            
            <MultipleSelector
              value={selectedTerminalOptions}
              onChange={(options) => setSelectedTerminals(options.map(opt => opt.value))}
              options={terminalOptions}
              placeholder="Выберите терминалы"
              hidePlaceholderWhenSelected
              className="w-auto"
              commandProps={{
                label: "Выберите терминалы",
              }}
              selectFirstItem={false}
            />
            
            <Input
              placeholder="Номер заказа"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-auto"
            />
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="needAction" 
                checked={needAction}
                onCheckedChange={(checked) => setNeedAction(checked === true)}
              />
              <label
                htmlFor="needAction"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Требуют действия
              </label>
            </div>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          // @ts-ignore
          data={missedOrdersData.data}
          loading={isLoading}
          pageCount={Math.ceil(missedOrdersData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </CardContent>
    </Card>
  );
} 