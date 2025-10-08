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
      return <div>{value ? dayjs(value, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</div>;
    },
  },
  {
    accessorKey: "end_time",
    header: "Конец",
    cell: ({ row }) => {
      const value = row.getValue("end_time") as string;
      return <div>{value ? dayjs(value, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</div>;
    },
  },
  {
    accessorKey: "max_start_time",
    header: "Макс. время начала",
    cell: ({ row }) => {
      const value = row.getValue("max_start_time") as string;
      return <div>{value ? dayjs(value, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</div>;
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
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/work_schedules/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/work_schedules/edit?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Рабочие графики</CardTitle>
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
  );
} 