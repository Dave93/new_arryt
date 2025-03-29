"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { apiClient, useGetAuthHeaders } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TimeField } from "../../../components/ui/time-field";

// Схема формы с валидацией Zod
const formSchema = z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  date: z.string().min(1, { message: "Время начисления обязательно" }),
  amount: z.coerce.number().min(0, { message: "Сумма должна быть не меньше 0" }),
  late_minus_sum: z.coerce.number().min(0, { message: "Сумма штрафа должна быть не меньше 0" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function DailyGarantCreate() {
  const router = useRouter();
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: "",
      amount: 0,
      late_minus_sum: 0,
    },
  });

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Форматирование времени в формат HH:MM:SS
      const formattedValues = {
        ...values,
        date: values.date + ":00", // Добавляем секунды, если их нет
      };

      await apiClient.api.daily_garant.index.post({
        data: formattedValues,
      }, {
        headers: authHeaders,
      });
      
      toast.success("Тариф дневного гаранта успешно создан");
      router.push("/dashboard/daily_garant");
    } catch (error) {
      toast.error("Ошибка создания тарифа дневного гаранта");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Создать тариф дневного гаранта</CardTitle>
        </CardHeader>
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
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время начисления</FormLabel>
                    <FormControl>
                      <TimeField 
                        {...field}
                        onChange={(time: string) => field.onChange(time)}
                      />
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
                  name="late_minus_sum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сумма штрафа за опоздание</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Создание..." : "Создать"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 