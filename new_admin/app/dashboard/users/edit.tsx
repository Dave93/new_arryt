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
        return response.data || [];
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
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["user", id],
    // @ts-ignore
    queryFn: async () => {
      try {
        // @ts-ignore
        const response = await apiClient.api.users({id}).get({
          query: {},
          headers: authHeaders,
        });
        return response.data;
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
      /*@ts-ignore*/
      form.reset({
        // @ts-ignore
        id: user.id,
        // @ts-ignore
        first_name: user.first_name,
        // @ts-ignore
        last_name: user.last_name,
        // @ts-ignore
        phone: user.phone,
        // @ts-ignore
        status: user.status,
        // @ts-ignore
        roles: user.roles?.id || "",
        // @ts-ignore
        drive_type: user.drive_type || "",
        // @ts-ignore
        users_terminals: user.terminals?.map(t => t.id) || [],
        // @ts-ignore
        users_work_schedules: user.work_schedules?.map(s => s.id) || [],
        // @ts-ignore
        daily_garant_id: user.daily_garant_id || "",
        // @ts-ignore
        max_active_order_count: user.max_active_order_count,
        // @ts-ignore
        card_name: user.card_name || "",
        // @ts-ignore
        card_number: user.card_number || "",
        // @ts-ignore
        car_model: user.car_model || "",
        // @ts-ignore
        car_number: user.car_number || "",
      });
    }
  }, [user, form]);

  // Обработка отправки формы
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await apiClient.api.users({id: values.id}).put({
        // @ts-ignore
        data: values,
      }, {
        // @ts-ignore
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите роль" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип доставки" />
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
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите дневной гарант" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Нет</SelectItem>
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