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
import { Skeleton } from "../../../components/ui/skeleton";

// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение типа терминала
interface Terminal {
  id: string;
  name: string;
  active: boolean;
  allow_close_anywhere: boolean;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  phone: string;
  latitude: number;
  longitude: number;
  external_id: string;
  manager_name: string;
  address: string;
  fuel_bonus: boolean;
  time_to_yandex: number;
  region: string;
}

// Схема формы с валидацией Zod
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(true),
  allow_close_anywhere: z.boolean().default(false),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  phone: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  region: z.string().optional(),
  time_to_yandex: z.coerce.number().optional(),
  external_id: z.string().optional(),
  manager_name: z.string().optional(),
  address: z.string().optional(),
  fuel_bonus: z.boolean().default(false),
});

export default function TerminalEdit() {
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
      allow_close_anywhere: false,
      organization_id: "",
      phone: "",
      latitude: 0,
      longitude: 0,
      region: "",
      time_to_yandex: 0,
      external_id: "",
      manager_name: "",
      address: "",
      fuel_bonus: false,
    },
  });

  // Загрузка списка организаций
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations_cached"],
    queryFn: async () => {
      try {
        const response = await apiClient.api.organizations.cached.get();
        console.log('response', response)
        return response.data || [];
      } catch (error) {
        toast.error("Failed to load organizations");
        return [];
      }
    },
  });

  // Загрузка данных терминала
  const { data: terminal, isLoading } = useQuery({
    queryKey: ["terminal", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const {data:response} = await apiClient.api.terminals({id}).get();
        return response?.data;
      } catch (error) {
        toast.error("Failed to fetch terminal details");
        router.push("/dashboard/terminals");
        return null;
      }
    },
    enabled: !!id,
  });

  // Заполнение формы данными терминала
  useEffect(() => {
    if (terminal) {
      form.reset({
        id: terminal.id,
        name: terminal.name,
        active: terminal.active,
        allow_close_anywhere: terminal.allow_close_anywhere,
        organization_id: terminal.organization_id,
        phone: terminal.phone || "",
        latitude: terminal.latitude,
        longitude: terminal.longitude,
        region: terminal.region || "capital",
        time_to_yandex: terminal.time_to_yandex || 0,
        external_id: terminal.external_id || "",
        manager_name: terminal.manager_name || "",
        address: terminal.address || "",
        fuel_bonus: terminal.fuel_bonus,
      });
    }
  }, [terminal, form]);

  // Обработка отправки формы
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.api.terminals({id}).put({
        // @ts-ignore
        body: values,
      });
      
      toast.success("Филиал успешно обновлен");
      router.push("/dashboard/terminals");
    } catch (error) {
      toast.error("Ошибка обновления филиала");
      console.error("Error updating terminal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <TerminalSkeleton />;
  }
console.log('organizations', organizations)
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/terminals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать филиал</CardTitle>
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
                          Активирует или деактивирует филиал
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

                <FormField
                  control={form.control}
                  name="allow_close_anywhere"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Разрешить закрытие заказа в любом месте</FormLabel>
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
                  name="fuel_bonus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Выдавать на топливо</FormLabel>
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
                        <Input {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите организацию">
                              {field.value ? organizations.find((org: Organization) => org.id === field.value)?.name : "Выберите организацию"}
                            </SelectValue>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manager_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Менеджер</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Широта</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Долгота</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Региональность</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "capital"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип региона" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="capital">Столица</SelectItem>
                          <SelectItem value="region">Регион</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_to_yandex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Минуты до отправки Яндексом</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Если не указать минуты или указать 0, то по-умолчанию будет 15 мин.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="external_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Внешний идентификатор</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Компонент скелетона для состояния загрузки
function TerminalSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[100px] w-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="h-10 w-[120px]" />
        </div>
      </CardContent>
    </Card>
  );
} 