"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { UsersModel } from "../../../../api/src/modules/user/dto/list.dto";

// Определение типов
interface Terminal {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
}

interface WorkSchedule {
  id: string;
  name: string;
  organization: {
    id: string;
    name: string;
  };
}

interface DailyGarant {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  drive_type: string;
  max_active_order_count?: number;
  card_name?: string;
  card_number?: string;
  car_model?: string;
  car_number?: string;
  roles: {
    id: string;
    name: string;
  };
  terminals: {
    id: string;
    name: string;
  }[];
  work_schedules?: {
    id: string;
    name: string;
  }[];
  daily_garant_id?: string;
}

// Типы доставки
const driveTypes = [
  { value: "car", label: "Автомобиль" },
  { value: "bike", label: "Велосипед" },
  { value: "foot", label: "Пешком" },
  { value: "scooter", label: "Самокат" },
];

// Статусы пользователя
const userStatuses = [
  { value: "active", label: "Активный" },
  { value: "inactive", label: "Неактивный" },
  { value: "blocked", label: "Заблокирован" },
];

// Схема формы с валидацией Zod
const formSchema = z.object({
  id: z.string(),
  first_name: z.string().min(1, { message: "Имя обязательно" }),
  last_name: z.string().min(1, { message: "Фамилия обязательна" }),
  phone: z.string().min(1, { message: "Телефон обязателен" }),
  status: z.string().min(1, { message: "Статус обязателен" }),
  roles: z.string().min(1, { message: "Роль обязательна" }),
  drive_type: z.string().optional(),
  users_terminals: z.array(z.string()).optional(),
  users_work_schedules: z.array(z.string()).optional(),
  daily_garant_id: z.string().optional(),
  max_active_order_count: z.coerce.number().optional(),
  card_name: z.string().optional(),
  card_number: z.string().optional(),
  car_model: z.string().optional(),
  car_number: z.string().optional(),
});

export default function UserEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      first_name: "",
      last_name: "",
      phone: "",
      status: "",
      roles: "",
      drive_type: "",
      users_terminals: [],
      users_work_schedules: [],
      daily_garant_id: "",
      max_active_order_count: undefined,
      card_name: "",
      card_number: "",
      car_model: "",
      car_number: "",
    },
  });

  // Загрузка списка ролей
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.roles.cached.get({
          headers: authHeaders,
        });
        return response.data || [];
      } catch (error) {
        toast.error("Не удалось загрузить роли");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Загрузка списка филиалов
  const { data: terminals = [] } = useQuery({
    queryKey: ["terminals"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        let res = response.data || [];
        res.sort((a: Terminal, b: Terminal) => a.name.localeCompare(b.name))
        return res;
      } catch (error) {
        toast.error("Не удалось загрузить филиалы");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Загрузка списка рабочих графиков
  const { data: workSchedules = [] } = useQuery<WorkSchedule[]>({
    queryKey: ["workSchedules"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.work_schedules.cached.get({
          headers: authHeaders,
        });
        return response.data || [];
      } catch (error) {
        toast.error("Не удалось загрузить рабочие графики");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Загрузка списка дневных гарантов
  const { data: dailyGarants = [] } = useQuery({
    queryKey: ["dailyGarants"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.daily_garant.cached.get({
          headers: authHeaders,
        });
        return response.data || [];
      } catch (error) {
        toast.error("Не удалось загрузить дневные гаранты");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Загрузка данных пользователя
  const { data: user, isLoading } = useQuery<UsersModel | undefined>({
    queryKey: ["user", id],
    queryFn: async () => {
      try {
        const response = await apiClient.api.users({id: id!}).get({
          query: {
            fields: [
              "id",
              "first_name",
              "last_name",
              "created_at",
              "drive_type",
              "car_model",
              "car_number",
              "card_name",
              "card_number",
              "phone",
              "latitude",
              "longitude",
              "status",
              "max_active_order_count",
              "doc_files",
              "terminals.id",
              "terminals.name",
              "roles.id",
              "roles.name",
            ].join(","),
          },
          headers: authHeaders,
        });
        return response.data?.data;
      } catch (error) {
        toast.error("Не удалось загрузить данные пользователя");
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  // Группировка графиков по организациям
  const workSchedulesByOrg = workSchedules.reduce((acc: Record<string, WorkSchedule[]>, curr: WorkSchedule) => {
    const orgName = curr.organization?.name || "Без организации";
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(curr);
    return acc;
  }, {});

  // Заполнение формы данными из запроса
  useEffect(() => {
    if (user) {
      console.log("Setting form values with user data:", user);
      
      // Using setTimeout to ensure the form reset happens after the component is fully rendered
      setTimeout(() => {
        form.reset({
          id: user.id,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone: user.phone || "",
          status: user.status || "",
          roles: user.roles?.id || "",
          drive_type: user.drive_type || undefined,
          users_terminals: user.terminals?.map(t => t.id) || [],
          users_work_schedules: user.work_schedules?.map(s => s.id) || [],
          daily_garant_id: user.daily_garant_id || "none",
          max_active_order_count: user.max_active_order_count || undefined,
          card_name: user.card_name || "",
          card_number: user.card_number || "",
          car_model: user.car_model || "",
          car_number: user.car_number || "",
        });
        
        console.log("Form values after reset:", form.getValues());
      }, 50);
    }
  }, [user, form]);

  // Обработка отправки формы
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Transform "none" value back to empty string for daily_garant_id
      const formData = {
        ...values,
        daily_garant_id: values.daily_garant_id === "none" ? "" : values.daily_garant_id
      };
      
      await apiClient.api.users({id: values.id}).put({
        data: {
          ...formData,
          users_terminals: undefined,
          users_work_schedules: undefined,
          usersTerminals: formData.users_terminals || [],
          usersWorkSchedules: formData.users_work_schedules || [],
          // @ts-ignore
          drive_type: formData.drive_type || undefined,
          status: formData.status as "active" | "inactive" | "blocked",
          daily_garant_id: formData.daily_garant_id || undefined,
        },
      }, {
        headers: authHeaders,
      });
      
      toast.success("Пользователь успешно обновлен");
      router.push("/dashboard/users");
    } catch (error) {
      toast.error("Ошибка обновления пользователя");
      console.error("Error updating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <UserSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select 
                        key={`status-${field.value}`}
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                            <SelectValue placeholder="Выберите статус">
                              {field.value ? userStatuses.find(s => s.value === field.value)?.label : "Выберите статус"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userStatuses.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Роль</FormLabel>
                      <Select 
                        key={`roles-${field.value}`}
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                            <SelectValue placeholder="Выберите роль">
                              {field.value ? roles.find((r: Role) => r.id === field.value)?.name : "Выберите роль"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role: Role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите имя" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите фамилию" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите телефон" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="drive_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип доставки</FormLabel>
                      <Select 
                        key={`drive-type-${field.value}`}
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                            <SelectValue placeholder="Выберите тип доставки">
                              {field.value ? driveTypes.find(t => t.value === field.value)?.label : "Выберите тип доставки"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {driveTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="users_terminals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Филиалы</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange([...field.value || [], value]);
                        }}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите филиалы" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {terminals.map((terminal: Terminal) => (
                            <SelectItem key={terminal.id} value={terminal.id}>
                              {terminal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((terminalId) => {
                          const terminal = terminals.find((t: Terminal) => t.id === terminalId);
                          return terminal ? (
                            <div key={terminal.id} className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-md">
                              {terminal.name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 pl-2"
                                onClick={() => {
                                  field.onChange(field.value?.filter(id => id !== terminalId));
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="users_work_schedules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Рабочие графики</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange([...field.value || [], value]);
                        }}
                        value=""
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите рабочие графики" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(workSchedulesByOrg).map(([orgName, schedules]) => (
                            <div key={orgName}>
                              <div className="px-2 py-1.5 text-sm font-semibold">{orgName}</div>
                              {(schedules as WorkSchedule[]).map((schedule: WorkSchedule) => (
                                <SelectItem key={schedule.id} value={schedule.id}>
                                  {schedule.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map((scheduleId) => {
                          const schedule = workSchedules.find((s: WorkSchedule) => s.id === scheduleId);
                          return schedule ? (
                            <div key={schedule.id} className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-md">
                              {schedule.name}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 pl-2"
                                onClick={() => {
                                  field.onChange(field.value?.filter(id => id !== scheduleId));
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="daily_garant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дневной гарант</FormLabel>
                      <Select 
                        key={`daily-garant-${field.value}`}
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                            <SelectValue placeholder="Выберите дневной гарант">
                              {field.value === "none" ? "Нет" : 
                               field.value ? dailyGarants.find(g => g.id === field.value)?.name : 
                               "Выберите дневной гарант"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Нет</SelectItem>
                          {dailyGarants.map((garant: DailyGarant) => (
                            <SelectItem key={garant.id} value={garant.id}>
                              {garant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_active_order_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Максимальное количество активных заказов</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="card_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя на карте</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите имя на карте" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="card_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер карты</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите номер карты" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="car_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Модель автомобиля</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите модель автомобиля" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="car_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер автомобиля</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите номер автомобиля" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Сохранить"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Скелетон для загрузки
function UserSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <Skeleton className="h-10 w-[100px] mt-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 