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
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Определяем тип Customer
interface Customer {
  id: string;
  name: string;
  phone: string;
}

// Add this interface above the CustomersList component
interface CustomerApiResponse {
  id: string;
  name: string;
  phone: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Определяем колонки для таблицы
const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "Ф.И.О.",
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
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/customers/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function CustomersList() {
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

  const { data: customersData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["customers", searchQuery, pagination.pageIndex, pagination.pageSize],
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

        const response = await apiClient.api.customers.get({
          query: {
            fields: ["id", "name", "phone"].join(","),
            limit: limit.toString(),
            offset: offset.toString(),
            filters: JSON.stringify(filters),
          },
        });

        return {
          total: response.data?.total || 0,
          data: (response.data?.data || []).map((item: CustomerApiResponse) => ({
            id: item.id,
            name: item.name,
            phone: item.phone,
          })),
        };
      } catch (error) {
        toast.error("Failed to fetch customers", {
          description: "There was an error loading the customers. Please try again.",
        });
        throw error;
      }
    },
  });

  return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Клиенты</CardTitle>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Поиск клиентов..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-[300px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={customersData.data} 
            loading={isLoading} 
            pageCount={Math.ceil(customersData.total / pagination.pageSize)}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </CardContent>
      </Card>
  );
} 