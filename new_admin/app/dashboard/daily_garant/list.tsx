"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PageTitle } from "@/components/page-title";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { format } from "date-fns";

// Определение типа для дневного гаранта
interface DailyGarant {
  id: string;
  name: string;
  amount: number;
  work_hours: number;
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
    accessorKey: "amount",
    header: "Сумма",
    cell: ({ row }) => {
      const amount = row.getValue("amount");
      return <div>{new Intl.NumberFormat("ru-RU").format(Number(amount))}</div>;
    },
  },
  {
    accessorKey: "work_hours",
    header: "Часов в смене",
    cell: ({ row }) => {
      const hours = Number(row.getValue("work_hours")) || 12;
      const hourCost = Math.round(Number(row.original.amount) / hours);
      return (
        <div>
          {hours} ч{" "}
          <span className="text-muted-foreground">
            · {new Intl.NumberFormat("ru-RU").format(hourCost)}/ч
          </span>
        </div>
      );
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
        <DeleteDailyGarantButton id={row.original.id} name={row.original.name} />
      </div>
    ),
  },
];

function DeleteDailyGarantButton({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await apiClient.api.daily_garant({ id }).delete();
      if (error) {
        const message = (error.value as { message?: string } | undefined)?.message;
        toast.error(message || "Не удалось удалить тариф");
        return;
      }
      toast.success(`Тариф «${name}» удалён`);
      queryClient.invalidateQueries({ queryKey: ["dailyGarant"] });
    } catch {
      toast.error("Не удалось удалить тариф");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isDeleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить тариф «{name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Тариф пропадёт из списка и из выбора у курьеров. История начислений сохранится.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function DailyGarantList() {
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

        const {data: response} = await apiClient.api.daily_garant.get({
          query: {
            fields: "id,name,amount,work_hours,created_at",
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
    <>
    <PageTitle title="Тарифы дневного гаранта" />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
    </>
  );
} 