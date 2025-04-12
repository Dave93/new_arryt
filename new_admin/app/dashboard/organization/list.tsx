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
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";

// Константа для преобразования типов оплаты
const PAYMENT_TYPE_NAMES = {
  cash: "Наличные",
  card: "Карта",
  client: "Клиент",
};

// Define Organization interface
interface Organization {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  phone: string;
  webhook: string;
  payment_type: string;
  allow_yandex_delivery: boolean;
}

// Define columns for data table
const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "active",
    header: "Активность",
    cell: ({ row }) => (
      <Switch 
        checked={row.getValue("active")} 
        disabled 
        className="ml-2" 
      />
    ),
  },
  {
    accessorKey: "allow_yandex_delivery",
    header: "Яндекс доставка",
    cell: ({ row }) => (
      <Switch 
        checked={row.getValue("allow_yandex_delivery")} 
        disabled 
        className="ml-2" 
      />
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
    accessorKey: "phone",
    header: "Телефон",
    cell: ({ row }) => <div>{row.getValue("phone")}</div>,
  },
  {
    accessorKey: "webhook",
    header: "Вебхук",
    cell: ({ row }) => <div>{row.getValue("webhook")}</div>,
  },
  {
    accessorKey: "payment_type",
    header: "Тип оплаты",
    cell: ({ row }) => {
      const paymentType = row.getValue("payment_type") as string;
      const typeLower = paymentType?.toLowerCase();
      return <div>{PAYMENT_TYPE_NAMES[typeLower as keyof typeof PAYMENT_TYPE_NAMES] || paymentType}</div>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Дата создания",
    cell: ({ row }) => (
      <div>
        {format(new Date(row.getValue("created_at")), "dd.MM.yyyy HH:mm")}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/organization/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/organization/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function OrganizationList() {
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

  const { data: organizationsData = { total: 0, data: [] }, isLoading, error } = useQuery({
    queryKey: ["organizations", searchQuery, pagination.pageIndex, pagination.pageSize],
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

          filters.push({
            field: "phone",
            operator: "contains",
            value: searchQuery,
          });
        }

        const offset = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;

        const response = await apiClient.api.organization[""].get({
          query: {
            fields: ["id", "name", "active", "created_at", "phone", "webhook", "payment_type", "allow_yandex_delivery"].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
        });

        return {
          total: response.data?.total || 0,
          data: response.data?.data || [],
        };
      } catch (error) {
        toast.error("Failed to fetch organizations", {
          description: "There was an error loading the organizations. Please try again.",
        });
        throw error;
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Список организаций</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск организаций..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <Button asChild>
            <Link href="/dashboard/organization/create">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          // @ts-ignore
          data={organizationsData.data}
          loading={isLoading}
          pageCount={Math.ceil(organizationsData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSize={pagination.pageSize}
        />
      </CardContent>
    </Card>
  );
} 