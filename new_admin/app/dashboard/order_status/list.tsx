"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../../components/ui/badge";

// Определяем тип OrderStatus
interface OrderStatus {
  id: string;
  name: string;
  sort: number;
  color: string;
  finish: boolean;
  cancel: boolean;
  waiting: boolean;
  need_location: boolean;
  on_way: boolean;
  in_terminal: boolean;
  should_pay: boolean;
  organization: {
    id: string;
    name: string;
  };
}

// Define the API response type
interface OrderStatusResponse {
  id: string;
  name: string;
  sort: number;
  color: string | null;
  finish: boolean;
  cancel: boolean;
  waiting: boolean;
  need_location: boolean;
  on_way: boolean;
  in_terminal: boolean;
  should_pay: boolean;
  organization: {
    id: string;
    name: string;
  };
}

// Определяем колонки для таблицы
const columns: ColumnDef<OrderStatus>[] = [
  {
    accessorKey: "sort",
    header: "Сортировка",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("sort")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "organization.name",
    header: "Организация",
    cell: ({ row }) => <div>{row.original.organization.name}</div>,
  },
  {
    accessorKey: "color",
    header: "Цвет",
    cell: ({ row }) => (
      <div 
        className="rounded-full w-5 h-5" 
        style={{ backgroundColor: row.getValue("color") }}
      ></div>
    ),
  },
  {
    accessorKey: "finish",
    header: "Завершающий",
    cell: ({ row }) => (
      row.getValue("finish") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "cancel",
    header: "Отменяющий",
    cell: ({ row }) => (
      row.getValue("cancel") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "waiting",
    header: "Ожидающий гостя",
    cell: ({ row }) => (
      row.getValue("waiting") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "need_location",
    header: "Требует местоположение",
    cell: ({ row }) => (
      row.getValue("need_location") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "in_terminal",
    header: "В филиале",
    cell: ({ row }) => (
      row.getValue("in_terminal") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "on_way",
    header: "В пути",
    cell: ({ row }) => (
      row.getValue("on_way") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    accessorKey: "should_pay",
    header: "Выплатить курьеру",
    cell: ({ row }) => (
      row.getValue("should_pay") ? 
        <Badge variant="default">Да</Badge> : 
        <Badge variant="outline">Нет</Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/order_status/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/order_status/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function OrderStatusList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [searchQuery]);

  const { data: orderStatusData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["orderStatuses", searchQuery, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter
        if (searchQuery) {
          filters.push({
            field: "name",
            operator: "contains",
            value: searchQuery,
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.order_status.index.get({
          query: {
            fields: [
              "id", 
              "name", 
              "sort", 
              "color", 
              "finish", 
              "cancel", 
              "waiting", 
              "need_location", 
              "on_way", 
              "in_terminal", 
              "should_pay", 
              "organization.id", 
              "organization.name"
            ].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
        });

        return {
          total: response?.data?.total || 0,
          data: (response?.data?.data || []).map((item: OrderStatusResponse) => ({
            id: item.id,
            name: item.name,
            sort: item.sort,
            color: item.color,
            finish: item.finish,
            cancel: item.cancel,
            waiting: item.waiting,
            need_location: item.need_location,
            on_way: item.on_way,
            in_terminal: item.in_terminal,
            should_pay: item.should_pay,
            organization: {
              id: item.organization.id,
              name: item.organization.name,
            }
          })),
        };
      } catch (error) {
        toast.error("Failed to fetch order statuses", {
          description: "There was an error loading the order statuses. Please try again.",
        });
        throw error;
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Статусы заказов</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск статусов..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button asChild>
            <Link href="/dashboard/order_status/create">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          // @ts-ignore
          columns={columns}
          // @ts-ignore
          data={orderStatusData.data} 
          loading={isLoading} 
          pageCount={Math.ceil(orderStatusData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </CardContent>
    </Card>
  );
} 