"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

// Определение типа для дневного гаранта
interface DailyGarant {
  id: string;
  name: string;
  date: string;
  amount: number;
  late_minus_sum: number;
  created_at: string;
}

// Определение колонок для таблицы
const columns: ColumnDef<DailyGarant>[] = [
  {
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "date",
    header: "Время",
    cell: ({ row }) => {
      const timeValue = row.getValue("date") as string;
      // Форматирование времени в HH:MM
      return <div>{timeValue.substring(0, 5)}</div>;
    },
  },
  {
    accessorKey: "amount",
    header: "Сумма",
    cell: ({ row }) => {
      const amount = row.getValue("amount");
      return <div>{new Intl.NumberFormat("ru-RU").format(Number(amount))}</div>;
    },
  },
  {
    accessorKey: "late_minus_sum",
    header: "Сумма штрафа",
    cell: ({ row }) => {
      const penalty = row.getValue("late_minus_sum");
      return <div>{new Intl.NumberFormat("ru-RU").format(Number(penalty))}</div>;
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
          <Link href={`/dashboard/daily_garant/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/daily_garant/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function DailyGarantList() {
  const [searchQuery, setSearchQuery] = useState("");
  const authHeaders = useGetAuthHeaders();
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

  const { data: dailyGarantData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["dailyGarant", searchQuery, pagination.pageIndex, pagination.pageSize],
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

        const {data: response} = await apiClient.api.daily_garant.index.get({
          headers: authHeaders,
          query: {
            fields: "id,name,date,amount,late_minus_sum,created_at",
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
        toast.error("Ошибка загрузки данных дневного гаранта");
        return { total: 0, data: [] };
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Тарифы дневного гаранта</CardTitle>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
          <Button asChild>
            <Link href="/dashboard/daily_garant/create">
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          // @ts-ignore
          data={dailyGarantData.data} 
          loading={isLoading}
          pageCount={Math.ceil(dailyGarantData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </CardContent>
    </Card>
  );
} 