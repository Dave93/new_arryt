"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "../../../components/ui/data-table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Plus, Edit, Phone, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "../../../components/ui/switch";
import { format } from "date-fns";
import { Badge } from "../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../../components/ui/form";
import { useForm } from "react-hook-form";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

// Определение типа для пользователя
interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  is_online: boolean;
  drive_type: string;
  created_at: string;
  app_version: string;
  work_schedules?: {
    id: string;
    name: string;
  }[];
}

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение типа терминала
interface Terminal {
  id: string;
  name: string;
}

// Определение типа роли
interface Role {
  id: string;
  name: string;
}

// Mapping для статусов пользователей
const userStatusMap: Record<string, string> = {
  "active": "Активный",
  "inactive": "Неактивный",
  "blocked": "Заблокирован"
};

// Mapping для типов доставки
const driveTypeMap: Record<string, string> = {
  "car": "Автомобиль",
  "bike": "Велосипед",
  "foot": "Пешком",
  "scooter": "Самокат"
};

// Определение колонок для таблицы
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "is_online",
    header: "Онлайн",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <div 
          className={`w-3 h-3 rounded-full ${row.getValue("is_online") ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>
    ),
  },
  {
    id: "fullName",
    header: "ФИО",
    cell: ({ row }) => {
      const firstName = row.original.first_name || "";
      const lastName = row.original.last_name || "";
      return <div className="font-medium">{`${lastName} ${firstName}`}</div>;
    },
  },
  {
    accessorKey: "phone",
    header: "Телефон",
    cell: ({ row }) => <div>{row.getValue("phone")}</div>,
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "active" ? "default" : status === "blocked" ? "destructive" : "secondary"}>
          {userStatusMap[status] || status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "drive_type",
    header: "Тип доставки",
    cell: ({ row }) => {
      const value = row.getValue("drive_type") as string;
      return <div>{value ? driveTypeMap[value] || value : "-"}</div>;
    },
  },
  {
    accessorKey: "work_schedules",
    header: "График работы",
    cell: ({ row }) => {
      const workSchedules = row.original.work_schedules || [];
      return (
        <div className="flex flex-wrap gap-1">
          {workSchedules.length > 0 ? (
            workSchedules.map((schedule, index) => (
              <Badge key={`user-${row.original.id}-schedule-${schedule.id}-index-${index}`} variant="outline">
                {schedule.name}
              </Badge>
            ))
          ) : (
            <span>-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "app_version",
    header: "Версия приложения",
    cell: ({ row }) => {
      const value = row.getValue("app_version") as string;
      return <div>{value || "-"}</div>;
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
          <Link href={`/dashboard/users/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard/users/edit/?id=${row.original.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>
    ),
  },
];

export default function UsersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [selectedWorkScheduleId, setSelectedWorkScheduleId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCourierOption, setSelectedCourierOption] = useState<Option | null>(null);
  const [selectedOnlineStatus, setSelectedOnlineStatus] = useState<string>("all");
  const [selectedDriveTypes, setSelectedDriveTypes] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const authHeaders = useGetAuthHeaders();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const form = useForm({
    defaultValues: {
      terminal_id: "all",
      work_schedule_id: "all",
      status: "all",
      online_status: "all",
      role_id: "all",
      drive_types: []
    }
  });

  const { data: terminalsData, isLoading: isLoadingTerminals } = useQuery({
    queryKey: ["terminals_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        return response || [];
      } catch (error) {
        toast.error("Не удалось загрузить список филиалов");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  const { data: workSchedulesData, isLoading: isLoadingWorkSchedules } = useQuery({
    queryKey: ["work_schedules_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.work_schedules.cached.get({
          headers: authHeaders,
        });
        return response || [];
      } catch (error) {
        toast.error("Не удалось загрузить список графиков работы");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.roles.cached.get({
          headers: authHeaders,
        });
        return response || [];
      } catch (error) {
        toast.error("Не удалось загрузить список ролей");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0
    }));
  }, [
    searchQuery, 
    selectedTerminalId, 
    selectedWorkScheduleId, 
    selectedStatus, 
    selectedCourierOption, 
    selectedOnlineStatus, 
    selectedDriveTypes,
    selectedRoleId
  ]);

  // Function to fetch couriers for MultipleSelector (onSearch)
  const fetchCouriers = useCallback(async (search: string): Promise<Option[]> => {
    if (!authHeaders.Authorization) return [];
    try {
      const response = await apiClient.api.couriers.search.get({
        query: { search: search },
        headers: authHeaders,
      });
      const usersData = response.data || [];
      return usersData.map((user: { id: string; first_name: string | null; last_name: string | null }) => ({
        value: user.id,
        label: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      }));
    } catch (err) {
      console.error("Failed to fetch couriers:", err);
      toast.error("Не удалось найти курьеров");
      return [];
    }
  }, [authHeaders]);

  const { data: usersData = { total: 0, data: [] }, isLoading } = useQuery({
    queryKey: [
      "users", 
      searchQuery, 
      selectedTerminalId, 
      selectedWorkScheduleId, 
      selectedStatus, 
      selectedCourierOption?.value, 
      selectedOnlineStatus,
      selectedDriveTypes,
      selectedRoleId,
      pagination.pageIndex, 
      pagination.pageSize
    ],
    queryFn: async () => {
      try {
        const filters = [];

        // Add search filter for name or phone
        if (searchQuery) {
          filters.push({
            or: [
              {
                field: "first_name",
                operator: "contains",
                value: searchQuery,
              },
              {
                field: "last_name",
                operator: "contains",
                value: searchQuery,
              },
              {
                field: "phone",
                operator: "contains",
                value: searchQuery,
              }
            ]
          });
        }

        // Add terminal filter
        if (selectedTerminalId && selectedTerminalId !== "all") {
          filters.push({
            field: "users_terminals.terminal_id",
            operator: "eq",
            value: selectedTerminalId,
          });
        }

        // Add work schedule filter
        if (selectedWorkScheduleId && selectedWorkScheduleId !== "all") {
          filters.push({
            field: "users_work_schedules.work_schedule_id",
            operator: "eq",
            value: selectedWorkScheduleId,
          });
        }

        // Add status filter
        if (selectedStatus && selectedStatus !== "all") {
          filters.push({
            field: "status",
            operator: "eq",
            value: selectedStatus,
          });
        }

        // Add courier filter
        const courierId = selectedCourierOption?.value;
        if (courierId) {
          filters.push({
            field: "id",
            operator: "eq",
            value: courierId,
          });
        }

        // Add online status filter
        if (selectedOnlineStatus !== "all") {
          filters.push({
            field: "is_online",
            operator: "eq",
            value: selectedOnlineStatus === "online",
          });
        }

        // Add drive type filter
        if (selectedDriveTypes.length > 0) {
          filters.push({
            field: "drive_type",
            operator: "in",
            value: selectedDriveTypes,
          });
        }

        // Add role filter
        if (selectedRoleId && selectedRoleId !== "all") {
          filters.push({
            field: "users_roles.role_id",
            operator: "eq",
            value: selectedRoleId,
          });
        }

        const {data: response} = await apiClient.api.users.get({
          headers: authHeaders,
          query: {
            fields: [
              "id",
              "first_name",
              "last_name",
              "phone",
              "status",
              "is_online",
              "drive_type",
              "created_at",
              "app_version",
              "work_schedules.id",
              "work_schedules.name",
            ].join(","),
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
        toast.error("Не удалось загрузить данные пользователей");
        return { total: 0, data: [] };
      }
    },
  });

  const onTerminalFilterChange = (value: string) => {
    setSelectedTerminalId(value === "all" ? "" : value);
  };

  const onWorkScheduleFilterChange = (value: string) => {
    setSelectedWorkScheduleId(value === "all" ? "" : value);
  };

  const onStatusFilterChange = (value: string) => {
    setSelectedStatus(value === "all" ? "" : value);
  };

  const onOnlineStatusFilterChange = (value: string) => {
    setSelectedOnlineStatus(value);
  };

  const onDriveTypesFilterChange = (values: string[]) => {
    setSelectedDriveTypes(values);
  };

  const onRoleFilterChange = (value: string) => {
    setSelectedRoleId(value === "all" ? "" : value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-4 space-y-4 justify-between flex-col w-full">
          <CardTitle className="text-left w-full flex flex-row items-center justify-between">
            <div>
            Пользователи
            </div>

          <Button asChild>
            <Link href="/dashboard/users/create/">
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Link>
          </Button>
          </CardTitle>
          <Form {...form}>
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-4 flex-1 w-full">
              <FormField
                control={form.control}
                name="terminal_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        onTerminalFilterChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Фильтр по филиалу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        {terminalsData?.map((terminal: Terminal) => (
                          <SelectItem key={terminal.id} value={terminal.id}>
                            {terminal.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_schedule_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        onWorkScheduleFilterChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Фильтр по графику работы" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все графики работы</SelectItem>
                        {workSchedulesData?.map((schedule: { id: string; name: string }) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        onStatusFilterChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Фильтр по статусу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="inactive">Неактивный</SelectItem>
                        <SelectItem value="blocked">Заблокирован</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="online_status"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        onOnlineStatusFilterChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Онлайн статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="online">Онлайн</SelectItem>
                        <SelectItem value="offline">Оффлайн</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        onRoleFilterChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Фильтр по роли" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        {rolesData?.map((role: Role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drive_types"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <MultipleSelector
                      value={selectedDriveTypes.map(type => ({ value: type, label: driveTypeMap[type] || type }))}
                      onChange={(options) => {
                        const values = options.map(option => option.value);
                        field.onChange(values);
                        onDriveTypesFilterChange(values);
                      }}
                      className="w-full"
                      defaultOptions={Object.keys(driveTypeMap).map(key => ({ value: key, label: driveTypeMap[key] }))}
                      placeholder="Типы доставки..."
                      selectFirstItem={false}
                    />
                  </FormItem>
                )}
              />

              <MultipleSelector
                value={selectedCourierOption ? [selectedCourierOption] : []}
                onChange={(options) => setSelectedCourierOption(options[0] ?? null)}
                onSearch={fetchCouriers}
                placeholder="Поиск курьера..."
                loadingIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Загрузка курьеров...
                  </div>
                }
                emptyIndicator={
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    Курьеры не найдены.
                  </div>
                }
                maxSelected={1}
                hidePlaceholderWhenSelected
                triggerSearchOnFocus
                delay={300}
                className="w-full"
                commandProps={{
                  label: "Поиск курьера",
                }}
                selectFirstItem={false}
              />
            </div>
          </Form>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          // @ts-ignore
          data={usersData.data} 
          loading={isLoading}
          pageCount={Math.ceil(usersData.total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </CardContent>
    </Card>
  );
} 