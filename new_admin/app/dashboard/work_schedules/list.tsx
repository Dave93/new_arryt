"use client";

import { useState, useEffect } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PageTitle } from "@/components/page-title";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { scheduleTimeToLocal } from "@/lib/work-schedule-time";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit, Trash2, Loader2, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "@/lib/api-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";
import { Badge } from "../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Form, FormControl, FormField, FormItem } from "../../../components/ui/form";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";

const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
// Определение типа для рабочего графика
interface WorkSchedule {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  days: string[];
  start_time: string;
  end_time: string;
  max_start_time: string;
  bonus_price?: number;
}

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Mapping для дней недели
const daysOfWeekRu: Record<string, string> = {
  "1": "Понедельник",
  "2": "Вторник",
  "3": "Среда",
  "4": "Четверг",
  "5": "Пятница",
  "6": "Суббота",
  "7": "Воскресенье",
};

// Определение колонок для таблицы
const columns: ColumnDef<WorkSchedule>[] = [
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
    accessorKey: "name",
    header: "Название",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "organization.name",
    header: "Организация",
    cell: ({ row }) => {
      const workSchedule = row.original;
      return <div>{workSchedule.organization?.name || "-"}</div>;
    },
  },
  {
    accessorKey: "days",
    header: "Рабочие дни",
    cell: ({ row }) => {
      const days = row.original.days as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {days.map((day) => (
            <Badge key={day} variant="outline">
              {daysOfWeekRu[day] || day}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "start_time",
    header: "Начало",
    cell: ({ row }) => {
      const value = row.getValue("start_time") as string;
      return <div>{value ? scheduleTimeToLocal(value) : "-"}</div>;
    },
  },
  {
    accessorKey: "end_time",
    header: "Конец",
    cell: ({ row }) => {
      const value = row.getValue("end_time") as string;
      return <div>{value ? scheduleTimeToLocal(value) : "-"}</div>;
    },
  },
  {
    accessorKey: "max_start_time",
    header: "Макс. время начала",
    cell: ({ row }) => {
      const value = row.getValue("max_start_time") as string;
      return <div>{value ? scheduleTimeToLocal(value) : "-"}</div>;
    },
  },
  {
    accessorKey: "bonus_price",
    header: "Бонус",
    cell: ({ row }) => {
      const value = row.getValue("bonus_price");
      return <div>{value !== null && value !== undefined ? String(value) : "-"}</div>;
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
      <div className="flex justify-end gap-1">
        <IconLink href={`/dashboard/work_schedules/${row.original.id}`} label="Просмотр">
          <Eye className="h-4 w-4" />
        </IconLink>
        <IconLink href={`/dashboard/work_schedules/edit?id=${row.original.id}`} label="Редактировать">
          <Edit className="h-4 w-4" />
        </IconLink>
        <IconLink href={`/dashboard/work_schedules/create?copy=${row.original.id}`} label="Копировать">
          <Copy className="h-4 w-4" />
        </IconLink>
        <DeleteWorkScheduleButton id={row.original.id} name={row.original.name} />
      </div>
    ),
  },
];

/** Компактная кнопка-значок с подсказкой. */
function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Link href={href} aria-label={label}>
            {children}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type Usage = { active_couriers: number; only_schedule: string[] };

/**
 * Удаление графика — в архив: история смен остаётся. Перед подтверждением
 * показываем, со скольких активных курьеров график снимется и у кого он
 * единственный.
 */
function DeleteWorkScheduleButton({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDialog = async () => {
    setUsage(null);
    setOpen(true);
    const { data, error } = await apiClient.api.work_schedules({ id }).usage.get();
    if (error) {
      toast.error(apiErrorMessage(error, "Не удалось проверить, кому назначен график"));
      setOpen(false);
      return;
    }
    setUsage(data as Usage);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await apiClient.api.work_schedules({ id }).delete();
      if (error) {
        toast.error(apiErrorMessage(error, "Не удалось удалить график"));
        return;
      }
      // Снимается и с неактивных курьеров, но важно число активных — его и показываем.
      const active = usage?.active_couriers ?? 0;
      toast.success(`График «${name}» удалён`, {
        description: active ? `Снят с активных курьеров: ${active}` : undefined,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workSchedules"] });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={openDialog}
            aria-label="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Удалить</TooltipContent>
      </Tooltip>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить график «{name}»?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>График пропадёт из списка и из выбора у курьеров. История смен сохранится.</p>
                {!usage ? (
                  <p className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Проверяю, кому он назначен…
                  </p>
                ) : usage.active_couriers === 0 ? (
                  <p>Активным курьерам не назначен.</p>
                ) : (
                  <>
                    <p>
                      Будет снят с активных курьеров: <b className="text-foreground">{usage.active_couriers}</b>. Их
                      остальные графики останутся.
                    </p>
                    {usage.only_schedule.length > 0 && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
                        Останутся без графика ({usage.only_schedule.length}):{" "}
                        {usage.only_schedule.slice(0, 10).join(", ")}
                        {usage.only_schedule.length > 10 ? " и др." : ""}
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={!usage || isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function WorkScheduleList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const form = useForm({
    defaultValues: {
      organization_id: "all",
    }
  });

  const { data: organizationsData, isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.organizations.cached.get();
        return response || [];
      } catch (error) {
        toast.error("Failed to fetch organizations");
        return [];
      }
    },
  });

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [searchQuery, selectedOrgId]);

  const { data: workSchedulesData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: ["workSchedules", searchQuery, selectedOrgId, pagination.pageIndex, pagination.pageSize],
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

        // Add organization filter
        if (selectedOrgId && selectedOrgId !== "all") {
          filters.push({
            field: "organization_id",
            operator: "eq",
            value: selectedOrgId,
          });
        }

        const {data: response} = await apiClient.api.work_schedules.get({
          query: {
            fields: "id,name,active,organization_id,organization.name,days,start_time,end_time,max_start_time,bonus_price,created_at",
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
      } catch (error) {
        toast.error("Failed to fetch work schedules data");
        return { total: 0, data: [] };
      }
    },
  });

  const onOrgFilterChange = (value: string) => {
    setSelectedOrgId(value === "all" ? "" : value);
  };

  return (
    <>
    <PageTitle title="Рабочие графики" />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Form {...form}>
            <FormField
              control={form.control}
              name="organization_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onOrgFilterChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Фильтр по организации" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Все организации</SelectItem>
                      {organizationsData?.map((org: Organization) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </Form>
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
          <Button asChild>
            <Link href="/dashboard/work_schedules/create">
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
          data={workSchedulesData.data} 
          loading={isLoading}
          pageCount={Math.ceil(workSchedulesData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </CardContent>
    </Card>
    </>
  );
} 