"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { Card, CardContent } from "../../../components/ui/card";
import { apiClient } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { refineShift, ShiftFields, shiftSchema } from "./shift-fields";

// Схема формы с валидацией Zod
const formSchema = refineShift(z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  amount: z.coerce.number().min(0, { message: "Сумма должна быть не меньше 0" }),
  ...shiftSchema,
}));

type FormValues = z.infer<typeof formSchema>;

export default function DailyGarantCreate() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: 0,
      start_time: "",
      end_time: "",
    },
  });

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Форматирование времени в формат HH:MM:SS
      const formattedValues = {
        ...values,
      };

      const { error } = await apiClient.api.daily_garant.post({
        data: formattedValues,
      });
      
      if (error) {
        const message = (error.value as { message?: string } | undefined)?.message;
        toast.error(message || "Не удалось сохранить тариф");
        return;
      }
      // staleTime в QueryProvider — минута: без сброса форма и список
      // ещё минуту показывают тариф до сохранения.
      await queryClient.invalidateQueries({ queryKey: ["dailyGarant"] });
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
      <PageTitle title="Создать тариф дневного гаранта" />
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
                
              </div>
              
              <ShiftFields form={form} />

              
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