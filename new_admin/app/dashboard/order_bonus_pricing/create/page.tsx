"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Switch } from "../../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { sortTerminalsByName } from "../../../../lib/sort_terminals_by_name";
// Схема формы с валидацией Zod
const formSchema = z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(true),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  terminal_id: z.string().optional(),
  max_order_time: z.coerce.number().optional(),
  min_distance_km: z.coerce.number().optional(),
  rules: z.array(
    z.object({
      from: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
      to: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
      price: z.coerce.number().min(0, { message: "Цена должна быть не меньше 0" }),
    })
  ).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface Organization {
  id: string;
  name: string;
}

interface Terminal {
  id: string;
  name: string;
}

export default function OrderBonusPricingCreate() {
  const router = useRouter();
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      active: true,
      organization_id: "",
      terminal_id: undefined,
      max_order_time: undefined,
      min_distance_km: undefined,
      rules: [{ from: 0, to: 0, price: 0 }],
    },
  });

  // Загрузка организаций
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.organizations.cached.get({
          headers: authHeaders,
        });
        return data || [];
      } catch {
        toast.error("Ошибка загрузки организаций");
        return [];
      }
    },
  });

  // Загрузка терминалов
  const { data: terminals = [] } = useQuery<Terminal[]>({
    queryKey: ["terminals"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        return sortTerminalsByName(data || []);
      } catch {
        toast.error("Ошибка загрузки терминалов");
        return [];
      }
    },
  });

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.api.order_bonus_pricing.index.post({
        // @ts-ignore
        data: values,
      }, {
        headers: authHeaders,
      });
      
      toast.success("Условие бонуса успешно создано");
      router.push("/dashboard/order_bonus_pricing");
    } catch (error) {
      toast.error("Ошибка создания условия бонуса");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/order_bonus_pricing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Создать условие бонуса к заказу</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Активность</FormLabel>
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
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Организация</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите организацию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations.map((org) => (
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
                
                <FormField
                  control={form.control}
                  name="terminal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Филиал</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите филиал" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Не выбрано</SelectItem>
                          {terminals.map((terminal) => (
                            <SelectItem key={terminal.id} value={terminal.id}>
                              {terminal.name}
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
                  name="max_order_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Максимальное время доставки (мин.)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="min_distance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Минимальная дистанция (м.)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Правила расчета</h3>
                <div className="space-y-4">
                  {form.watch("rules").map((_, index) => (
                    <div key={index} className="flex items-end gap-4 p-4 border rounded-md">
                      <FormField
                        control={form.control}
                        name={`rules.${index}.from`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>От (км)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={0} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rules.${index}.to`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>До (км)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={0} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rules.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Цена</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min={0} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const currentRules = form.getValues("rules");
                            form.setValue("rules", currentRules.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentRules = form.getValues("rules");
                      form.setValue("rules", [...currentRules, { from: 0, to: 0, price: 0 }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить правило
                  </Button>
                </div>
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