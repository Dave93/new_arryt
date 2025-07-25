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
import { format } from "date-fns";

// Определение типа для условий бонуса к заказу
interface ConstructedBonusPricing {
  id: string;
  name: string;
  organization: {
    id: string;
    name: string;
  };
  created_at: string;
}

// Определение колонок для таблицы
const columns: ColumnDef<ConstructedBonusPricing>[] = [
  {
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "organization",
    header: "Организация",
    cell: ({ row }) => {
      const org = row.original.organization;
      return <div>{org?.name || "—"}</div>;
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
          <Link href={`/dashboard/constructed_bonus_pricing/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/constructed_bonus_pricing/${row.original.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function ConstructedBonusPricingList() {
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

  const { data: bonusPricingData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["constructedBonusPricing", searchQuery, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter for name
        if (searchQuery) {
          filters.push({
            field: "name",
            operator: "contains",
            value: searchQuery,
          });
        }

        const {data: response} = await apiClient.api.constructed_bonus_pricing.index.get({
          query: {
            fields: "id,name,organization.name,created_at",
            limit: pagination.pageSize.toString(),
            offset: (pagination.pageIndex * pagination.pageSize).toString(),
            sort: JSON.stringify([
              {
                field: "created_at",
                order: "desc",
              },
            ]),
            ...(filters.length > 0 ? { filters: JSON.stringify(filters) } : {}),
          },
        });

        return {
          total: response?.total || 0,
          data: response?.data || [],
        };
      } catch {
        toast.error("Ошибка загрузки данных условий бонуса к заказу");
        return { total: 0, data: [] };
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Список условий бонуса к заказу</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
          <Button asChild>
            <Link href="/dashboard/constructed_bonus_pricing/create">
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={bonusPricingData.data as ConstructedBonusPricing[]} 
          loading={isLoading}
          pageCount={Math.ceil(bonusPricingData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </CardContent>
    </Card>
  );
} 