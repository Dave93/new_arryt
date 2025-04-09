"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Separator } from "../../../../components/ui/separator";
import { Skeleton } from "../../../../components/ui/skeleton";
import { sortTerminalsByName } from "../../../../lib/sort_terminals_by_name";
// Схема формы с валидацией Zod
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(true),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  terminal_id: z.string().optional().nullable(),
  terminal_ids: z.array(z.string()).optional(),
  max_order_time: z.coerce.number().optional().nullable(),
  min_distance_km: z.coerce.number().optional().nullable(),
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

export default function OrderBonusPricingEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const authHeaders = useGetAuthHeaders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approximatePrice, setApproximatePrice] = useState<number>(0);
  const [testDistance, setTestDistance] = useState<number | undefined>(undefined);
  
  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      active: true,
      organization_id: "",
      terminal_id: null,
      terminal_ids: [],
      max_order_time: null,
      min_distance_km: null,
      rules: [],
    },
  });

  // Загрузка данных бонуса
  const { data: bonusPricing, isLoading: isLoadingBonus } = useQuery({
    queryKey: ["orderBonusPricing", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const { data } = await apiClient.api.order_bonus_pricing({id}).get({
          headers: authHeaders,
        });
        // @ts-ignore
        return data?.data;
      } catch {
        toast.error("Ошибка загрузки данных бонуса");
        return null;
      }
    },
    enabled: !!id,
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

  // Заполнение формы данными
  useEffect(() => {
    if (bonusPricing) {
      // Обеспечиваем, что rules всегда имеет как минимум один элемент
      // @ts-ignore
      const rules = bonusPricing.rules?.length > 0 
        ? bonusPricing.rules 
        : [{ from: 0, to: 0, price: 0 }];
      
      form.reset({
        id: bonusPricing.id,
        name: bonusPricing.name,
        active: bonusPricing.active,
        organization_id: bonusPricing.organization_id,
        terminal_id: bonusPricing.terminal_id,
        terminal_ids: bonusPricing.terminal_ids || [],
        max_order_time: bonusPricing.max_order_time,
        min_distance_km: bonusPricing.min_distance_km,
        // @ts-ignore
        rules: rules,
      });
    }
  }, [bonusPricing, form]);

  // Расчет примерной цены
  const calculateApproximatePrice = (distance: number) => {
    if (!distance) return;
    
    const rules = form.getValues("rules");
    let price = 0;
    let remainingDistance = distance;

    if (rules && rules.length) {
      for (const rule of rules) {
        const { from, to, price: rulePrice } = rule;
        const segmentDistance = to - from;
        
        if (remainingDistance > 0 && to > from) {
          const applicableDistance = Math.min(segmentDistance, remainingDistance);
          price += rulePrice * (applicableDistance / segmentDistance);
          remainingDistance -= applicableDistance;
        }
      }
    }

    setApproximatePrice(Math.round(price));
  };

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.api.order_bonus_pricing({id}).put({
        // @ts-ignore
        data: values,
      }, {
        headers: authHeaders,
      });
      
      toast.success("Условие бонуса успешно обновлено");
      router.push("/dashboard/order_bonus_pricing");
    } catch (error) {
      toast.error("Ошибка обновления условия бонуса");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBonus) {
    return <EditSkeleton />;
  }

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
          <CardTitle>Редактировать условие бонуса к заказу</CardTitle>
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
                        value={field.value}
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

              <FormField
                control={form.control}
                name="terminal_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Филиалы (множественный выбор)</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const values = field.value || [];
                        if (values.includes(value)) {
                          field.onChange(values.filter(v => v !== value));
                        } else {
                          field.onChange([...values, value]);
                        }
                      }}
                      value=""
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиалы" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terminals.map((terminal) => (
                          <SelectItem key={terminal.id} value={terminal.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 border rounded ${(field.value || []).includes(terminal.id) ? 'bg-primary' : 'bg-transparent'}`} />
                              <span>{terminal.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(field.value || []).map(id => {
                        const terminal = terminals.find(t => t.id === id);
                        return terminal ? (
                          <div key={id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                            <span>{terminal.name}</span>
                            <button 
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => field.onChange((field.value || []).filter(v => v !== id))}
                            >
                              ✕
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="max_order_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Максимальное время доставки (мин.)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          min={0} 
                        />
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
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                          min={0} 
                        />
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
                {isSubmitting ? "Сохранение..." : "Сохранить"}
              </Button>
            </form>
          </Form>
          
          <Separator className="my-8" />
          
          <div>
            <h3 className="text-lg font-medium mb-4">Калькулятор примерного расчёта</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">Примерная дистанция (км)</label>
                <Input 
                  type="number" 
                  min={0} 
                  className="mt-2"
                  value={testDistance || ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                    setTestDistance(value);
                    if (value !== undefined) {
                      calculateApproximatePrice(value);
                    } else {
                      setApproximatePrice(0);
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Примерная цена</label>
                <div className="mt-2 p-2 border rounded">
                  {new Intl.NumberFormat("ru-RU").format(approximatePrice)} сум
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <Skeleton className="h-10 w-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <Skeleton className="h-10 w-24 mt-6" />
        </div>
      </CardContent>
    </Card>
  );
} 