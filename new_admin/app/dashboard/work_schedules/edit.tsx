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
import { apiClient } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Checkbox } from "../../../components/ui/checkbox";
import { Skeleton } from "../../../components/ui/skeleton";

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение типа рабочего графика
interface WorkSchedule {
  id: string;
  name: string;
  active: boolean;
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

// Дни недели
const daysOfWeek = [
  { value: "1", label: "Понедельник" },
  { value: "2", label: "Вторник" },
  { value: "3", label: "Среда" },
  { value: "4", label: "Четверг" },
  { value: "5", label: "Пятница" },
  { value: "6", label: "Суббота" },
  { value: "7", label: "Воскресенье" },
];

// Схема формы с валидацией Zod
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(true),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  days: z.array(z.string()).min(1, { message: "Выберите минимум один день недели" }),
  start_time: z.string().min(1, { message: "Время начала обязательно" }),
  end_time: z.string().min(1, { message: "Время окончания обязательно" }),
  max_start_time: z.string().min(1, { message: "Максимальное время начала обязательно" }),
  bonus_price: z.coerce.number().optional(),
});

export default function WorkScheduleEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      active: true,
      organization_id: "",
      days: [],
      start_time: "",
      end_time: "",
      max_start_time: "",
      bonus_price: undefined,
    },
  });

  // Загрузка списка организаций
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.organizations.cached.get();
        return response.data || [];
      } catch (error) {
        toast.error("Failed to load organizations");
        return [];
      }
    },
  });

  // Загрузка данных рабочего графика
  const { data: workSchedule, isLoading } = useQuery({
    queryKey: ["workSchedule", id],
    queryFn: async () => {
      try {
        // @ts-ignore
        const response = await apiClient.api.work_schedules({id}).get();
        return response.data;
      } catch (error) {
        toast.error("Failed to load work schedule");
        throw error;
      }
    },
    enabled: !!id,
  });

  // Заполнение формы данными из запроса
  useEffect(() => {
    if (workSchedule) {
      // @ts-ignore
      const formattedDays = Array.isArray(workSchedule.days)
        // @ts-ignore
        ? workSchedule.days.map((day: string) => String(day)) 
        : [];

      form.reset({
        // @ts-ignore
        id: workSchedule.id,
        // @ts-ignore
        name: workSchedule.name,
        // @ts-ignore
        active: workSchedule.active,
        // @ts-ignore
        organization_id: workSchedule.organization_id,
        // @ts-ignore
        days: formattedDays,
        // @ts-ignore
        start_time: workSchedule.start_time ? workSchedule.start_time.slice(0, 5) : "",
        // @ts-ignore
        end_time: workSchedule.end_time ? workSchedule.end_time.slice(0, 5) : "",
        // @ts-ignore
        max_start_time: workSchedule.max_start_time ? workSchedule.max_start_time.slice(0, 5) : "",
        // @ts-ignore
        bonus_price: workSchedule.bonus_price,
      });
    }
  }, [workSchedule, form]);

  // Обработка отправки формы
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await apiClient.api.work_schedules({id: values.id}).put({
        // @ts-ignore
        data: values,
      });
      
      toast.success("Рабочий график успешно обновлен");
      router.push("/dashboard/work_schedules");
    } catch (error) {
      toast.error("Ошибка обновления рабочего графика");
      console.error("Error updating work schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <WorkScheduleSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/work_schedules">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать рабочий график</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Активность</FormLabel>
                        <FormDescription>
                          Активирует или деактивирует рабочий график
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите название" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Организация</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите организацию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations.map((org: Organization) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Время начала</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Время окончания</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Максимальное время начала</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="days"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Дни недели</FormLabel>
                      <FormDescription>
                        Выберите рабочие дни
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {daysOfWeek.map((day) => (
                        <FormField
                          key={day.value}
                          control={form.control}
                          name="days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, day.value])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== day.value
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonus_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бонусная сумма за успеваемость</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>
                      Необязательное поле
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
function WorkScheduleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-10 w-full" />
          
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          <Skeleton className="h-4 w-1/4 mb-2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
          </div>
          
          <Skeleton className="h-10 w-[100px] mt-6" />
        </div>
      </CardContent>
    </Card>
  );
} 