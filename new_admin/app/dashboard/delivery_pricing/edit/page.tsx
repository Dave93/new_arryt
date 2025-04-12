"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Switch } from "../../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Separator } from "../../../../components/ui/separator";
import { Skeleton } from "../../../../components/ui/skeleton";
import { sortTerminalsByName } from "../../../../lib/sort_terminals_by_name";
// Определение типа организации
interface Organization {
  id: string;
  name: string;
}

// Определение типа филиала
interface Terminal {
  id: string;
  name: string;
  organization_id: string;
}

// Типы видов передвижения
const driveTypes = [
  { value: "car", label: "Автомобиль" },
  { value: "walking", label: "Пешком" },
  { value: "bike", label: "Велосипед" },
  { value: "scooter", label: "Самокат" },
];

// Типы оплаты
const paymentTypes = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "both", label: "Оба" },
];

// Дни недели
const daysOfWeek = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

// Схема для правил ценообразования
const ruleSchema = z.object({
  from: z.coerce.number().min(0),
  to: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

// Схема для правил ценообразования клиента
const clientRuleSchema = z.object({
  from: z.coerce.number().min(0),
  to: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

// Схема формы с валидацией Zod
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(true),
  default: z.boolean().default(false),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  terminal_id: z.string().optional(),
  drive_type: z.string().min(1, { message: "Вид передвижения обязателен" }),
  days: z.array(z.number()).min(1, { message: "Выберите минимум один день недели" }),
  start_time: z.string().min(1, { message: "Время начала обязательно" }),
  end_time: z.string().min(1, { message: "Время окончания обязательно" }),
  min_price: z.coerce.number().min(0, { message: "Цена должна быть положительной" }),
  price_per_km: z.coerce.number().min(0, { message: "Цена за км должна быть положительной" }),
  payment_type: z.string().optional(),
  rules: z.array(ruleSchema).optional(),
  order_source: z.string().optional(),
  min_distance: z.coerce.number().min(0).optional(),
  client_price_per_km: z.coerce.number().min(0).optional(),
  client_rules: z.array(clientRuleSchema).optional(),
});

export default function DeliveryPricingEdit() {
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
      name: "",
      active: true,
      default: false,
      organization_id: "",
      terminal_id: "",
      drive_type: "car",
      days: [1, 2, 3, 4, 5, 6, 7], // По умолчанию все дни недели
      start_time: "09:00",
      end_time: "21:00",
      min_price: 0,
      price_per_km: 0,
      payment_type: "both",
      rules: [{from: 0, to: 3, price: 0}],
      order_source: "",
      min_distance: 0,
      client_price_per_km: 0,
      client_rules: [{from: 0, to: 3, price: 0}],
    },
  });

  // Загрузка данных о ценообразовании для редактирования
  const { data: deliveryPricing, isLoading } = useQuery({
    queryKey: ["deliveryPricing", id],
    queryFn: async () => {
      try {
        // @ts-ignore
        const {data: response} = await apiClient.api.delivery_pricing({id}).get({
          headers: authHeaders,
        });
        return response?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных");
        throw error;
      }
    },
    enabled: !!id,
  });

  // Загрузка списка организаций
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.organizations.cached.get({
          headers: authHeaders,
        });
        return response || [];
      } catch {
        toast.error("Failed to load organizations");
        return [];
      }
    },
  });

  // Заполнение формы данными
  useEffect(() => {
    if (deliveryPricing) {
      form.reset({
        id: deliveryPricing.id,
        name: deliveryPricing.name,
        active: deliveryPricing.active,
        default: deliveryPricing.default,
        organization_id: deliveryPricing.organization_id,
        terminal_id: deliveryPricing.terminal_id || "",
        drive_type: deliveryPricing.drive_type,
        // @ts-ignore
        days: deliveryPricing.days,
        start_time: deliveryPricing.start_time,
        end_time: deliveryPricing.end_time,
        // @ts-ignore
        min_price: deliveryPricing.min_price,
        price_per_km: deliveryPricing.price_per_km,
        // @ts-ignore
        payment_type: deliveryPricing.payment_type,
        // @ts-ignore
        rules: deliveryPricing.rules || [{from: 0, to: 3, price: 0}],
        // @ts-ignore
        order_source: deliveryPricing.order_source || "",
        // @ts-ignore
        min_distance: deliveryPricing.min_distance || 0,
        // @ts-ignore
        client_price_per_km: deliveryPricing.client_price_per_km || 0,
        // @ts-ignore
        client_rules: deliveryPricing.client_rules || [{from: 0, to: 3, price: 0}],
      });
    }
  }, [deliveryPricing, form]);


  // Загрузка списка филиалов для выбранной организации
  const { data: terminalsData = [] } = useQuery({
    queryKey: ["terminals_cached"],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.terminals.cached.get({
          headers: authHeaders
        });
        return sortTerminalsByName(response || []);
      } catch {
        toast.error("Failed to load terminals");
        return [];
      }
    },
    enabled: !!authHeaders,
  });

  // Функция добавления нового правила ценообразования
  const addRule = () => {
    const currentRules = form.getValues("rules") || [];
    form.setValue("rules", [...currentRules, {from: 0, to: 0, price: 0}]);
  };

  // Функция удаления правила ценообразования
  const removeRule = (index: number) => {
    const currentRules = form.getValues("rules") || [];
    form.setValue("rules", currentRules.filter((_, i) => i !== index));
  };

  // Функция добавления нового правила ценообразования для клиента
  const addClientRule = () => {
    const currentRules = form.getValues("client_rules") || [];
    form.setValue("client_rules", [...currentRules, {from: 0, to: 0, price: 0}]);
  };

  // Функция удаления правила ценообразования для клиента
  const removeClientRule = (index: number) => {
    const currentRules = form.getValues("client_rules") || [];
    form.setValue("client_rules", currentRules.filter((_, i) => i !== index));
  };

  // Обработка отправки формы
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // @ts-ignore
      await apiClient.api.delivery_pricing({id}).put({
        // @ts-ignore
        data: values,
      }, {
        headers: authHeaders,
      });
      
      toast.success("Условие доставки успешно обновлено");
      router.push("/dashboard/delivery_pricing");
    } catch (error) {
      toast.error("Ошибка обновления условия доставки");
      console.error("Error updating delivery pricing:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <DeliveryPricingFormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/delivery_pricing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать условие доставки</CardTitle>
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
                          Активирует или деактивирует условие доставки
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
                  name="default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>По-умолчанию</FormLabel>
                        <FormDescription>
                          Установить как условие доставки по умолчанию
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
                  name="drive_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вид передвижения</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите вид передвижения" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {driveTypes.map((type) => (
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
                  name="organization_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Организация</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Выберите организацию ${field.value}`}>
                              {organizations.find((org: Organization) => org.id == field.value)?.name}
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

                <FormField
                  control={form.control}
                  name="terminal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Филиал</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите филиал" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {terminalsData?.map((terminal: Terminal) => (
                            <SelectItem key={terminal.id} value={terminal.id}>
                              {terminal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Необязательно. Если не выбран, условие будет применяться ко всем филиалам организации.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="min_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Минимальная цена</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Минимальная дистанция (м)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Минимальная дистанция доставки в метрах
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <FormField
                control={form.control}
                name="days"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Дни недели</FormLabel>
                      <FormDescription>
                        Выберите дни, когда будет действовать это условие доставки
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="payment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип оплаты</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип оплаты" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentTypes.map((type) => (
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

                <FormField
                  control={form.control}
                  name="order_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Источник заказа</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: bitrix" {...field} />
                      </FormControl>
                      <FormDescription>
                        Необязательно. Если указан, правило будет применяться только к заказам из этого источника.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel>Правила ценообразования</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить правило
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {form.watch("rules")?.map((_, index) => (
                    <div key={index} className="flex items-end gap-4 border p-4 rounded-md">
                      <FormField
                        control={form.control}
                        name={`rules.${index}.from`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>От (км)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
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
                              <Input type="number" {...field} />
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
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => removeRule(index)}
                        className="mb-0.5"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />
              
              <h3 className="text-lg font-medium mb-6">Логика цены для клиента</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="client_price_per_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена за километр для клиента</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div></div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel>Правила ценообразования для клиента</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addClientRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить правило
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {form.watch("client_rules")?.map((_, index) => (
                    <div key={index} className="flex items-end gap-4 border p-4 rounded-md">
                      <FormField
                        control={form.control}
                        name={`client_rules.${index}.from`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>От (км)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`client_rules.${index}.to`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>До (км)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`client_rules.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Цена</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => removeClientRule(index)}
                        className="mb-0.5"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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

function DeliveryPricingFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          
          <Skeleton className="h-36 w-full" />
          
          <Skeleton className="h-16 w-full" />
          
          <Skeleton className="h-48 w-full" />
          
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </CardContent>
    </Card>
  );
} 