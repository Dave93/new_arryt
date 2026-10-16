"use client";

import { useEffect, useState } from "react";
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
  FormField,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { apiClient } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { PageTitle } from "@/components/page-title";

// Схема формы с валидацией Zod
const formSchema = z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  amount: z.coerce.number().min(0, { message: "Сумма должна быть не меньше 0" }),
  work_hours: z.coerce.number().int({ message: "Целое число часов" }).min(1, { message: "Не меньше 1 часа" }).max(24, { message: "Не больше 24 часов" }),
});

type FormValues = z.infer<typeof formSchema>;

// Скелетон для состояния загрузки
function DailyGarantSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-10 w-full" />
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
  );
}

export default function DailyGarantEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: 0,
      work_hours: 12,
    },
  });

  // Запрос данных для редактирования
  const { data: dailyGarant, isLoading } = useQuery({
    queryKey: ["dailyGarant", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const { data } = await apiClient.api.daily_garant({ id }).get();
        return data?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных дневного гаранта");
        console.error(error);
        return null;
      }
    },
    enabled: !!id,
  });

  // Заполнение формы данными при их получении
  useEffect(() => {
    if (dailyGarant) {
      // Форматируем время из HH:MM:SS в HH:MM
      
      form.reset({
        name: dailyGarant.name || "",
        amount: dailyGarant.amount || 0,
        work_hours: dailyGarant.work_hours || 12,
      });
    }
  }, [dailyGarant, form]);

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      // Форматирование времени в формат HH:MM:SS
      const formattedValues = {
        ...values,
      };

      await apiClient.api.daily_garant({ id }).put({
        data: formattedValues,
      });
      
      toast.success("Тариф дневного гаранта успешно обновлен");
      router.push("/dashboard/daily_garant");
    } catch (error) {
      toast.error("Ошибка обновления тарифа дневного гаранта");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/dashboard/daily_garant">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Link>
          </Button>
        </div>
        <DailyGarantSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Редактировать тариф дневного гаранта" />
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/daily_garant">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма гаранта</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="work_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Часов в смене</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} max={24} step={1} />
                      </FormControl>
                      <FormDescription>
                        Опоздание больше 30 минут — минус час гаранта за каждый начатый час (сумма ÷ часы)
                      </FormDescription>
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