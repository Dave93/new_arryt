"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
import { apiClient } from "../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Skeleton } from "../../../components/ui/skeleton";

// Схема валидации для правил
const ruleSchema = z.object({
  distance_from: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
  distance_to: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
  time_from: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
  time_to: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
  price: z.coerce.number().min(0, { message: "Значение должно быть не меньше 0" }),
});

// Схема валидации для ценовой категории
const pricingSchema = z.object({
  terminal_ids: z.array(z.string()).optional(),
  courier_id: z.string().optional(),
  rules: z.array(ruleSchema).min(1, { message: "Добавьте хотя бы одно условие" }),
});

// Основная схема валидации формы
const formSchema = z.object({
  name: z.string().min(1, { message: "Название обязательно" }),
  organization_id: z.string().min(1, { message: "Организация обязательна" }),
  pricing: z.array(pricingSchema).min(1, { message: "Добавьте хотя бы одну ценовую категорию" }),
});

type FormValues = z.infer<typeof formSchema>;

// Интерфейс для организации
interface Organization {
  id: string;
  name: string;
}

// Интерфейс для терминала
interface Terminal {
  id: string;
  name: string;
}

// Интерфейс для курьера
interface Courier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

// Интерфейс для загруженных данных
interface ConstructedBonusPricing {
  id: string;
  name: string;
  organization_id: string;
  pricing: {
    terminal_ids?: string[];
    courier_id?: string;
    rules: {
      distance_from: number;
      distance_to: number;
      time_from: number;
      time_to: number;
      price: number;
    }[];
  }[];
}

// Скелетон для состояния загрузки
function ConstructedBonusPricingSkeleton() {
  return (
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
          
          <div>
            <Skeleton className="h-4 w-1/4 mb-4" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
          
          <Skeleton className="h-10 w-[100px] mt-6" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ConstructedBonusPricingEditProps {
  id?: string;
}

export default function ConstructedBonusPricingEdit({ id: propId }: ConstructedBonusPricingEditProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = propId || searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  // const [couriers, setCouriers] = useState<Courier[]>([]);
  // const [courierSearchTerm, setCourierSearchTerm] = useState("");

  // Инициализация формы
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      organization_id: "",
      pricing: [
        {
          terminal_ids: [],
          courier_id: "",
          rules: [
            {
              distance_from: 0,
              distance_to: 0,
              time_from: 0,
              time_to: 0,
              price: 0,
            }
          ]
        }
      ],
    },
  });

  // Получение fieldArray для работы с динамическими полями
  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({
    control: form.control,
    name: "pricing",
  });

  // Загрузка данных для редактирования
  const { data: bonusPricing, isLoading } = useQuery({
    queryKey: ["constructedBonusPricing", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const { data } = await apiClient.api.constructed_bonus_pricing({ id }).get();
        return data?.data as ConstructedBonusPricing;
      } catch (error) {
        toast.error("Ошибка загрузки данных условия бонуса к заказу");
        console.error(error);
        return null;
      }
    },
    enabled: !!id,
  });

  // Загрузка списка организаций и терминалов
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка терминалов
        const terminalsResponse = await apiClient.api.terminals.cached.get();
        if (terminalsResponse.data && Array.isArray(terminalsResponse.data)) {
          setTerminals(terminalsResponse.data.sort((a: Terminal, b: Terminal) => a.name.localeCompare(b.name)));
        }

        // Загрузка организаций
        const organizationsResponse = await apiClient.api.organizations.cached.get();
        if (organizationsResponse.data && Array.isArray(organizationsResponse.data)) {
          setOrganizations(organizationsResponse.data);
        }
      } catch (error) {
        toast.error("Ошибка загрузки данных");
        console.error(error);
      }
    };

    fetchData();
  }, []);

  // Загрузка данных курьеров, если они есть в полученных данных
  // useEffect(() => {
  //   const fetchCourierDetails = async () => {
  //     if (!bonusPricing?.pricing) return;
      
  //     const courierIds = bonusPricing.pricing
  //       .map(p => p.courier_id)
  //       .filter(id => !!id) as string[];
      
  //     if (courierIds.length === 0) return;
      
  //     try {
  //       // Здесь нужно загрузить данные о курьерах по их идентификаторам
  //       // Это зависит от конкретного API
  //       for (const courierId of courierIds) {
  //         const response = await apiClient.api.couriers({ id: courierId }).get();
          
  //         if (response.data && !couriers.some(c => c.id === response.data.id)) {
  //           setCouriers(prev => [...prev, response.data]);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Ошибка при загрузке данных курьеров:", error);
  //     }
  //   };
    
  //   if (bonusPricing) {
  //     fetchCourierDetails();
  //   }
  // }, [bonusPricing]);

  // // Поиск курьеров
  // useEffect(() => {
  //   const fetchCouriers = async () => {
  //     if (!courierSearchTerm.trim()) return;

  //     try {
  //       const response = await apiClient.api.couriers.search.get({
  //         query: {
  //           search: courierSearchTerm,
  //         },
  //       });

  //       if (response.data && Array.isArray(response.data)) {
  //         setCouriers(response?.data as Courier[]);
  //       }
  //     } catch (error) {
  //       console.error("Ошибка при поиске курьеров:", error);
  //     }
  //   };

  //     const timeoutId = setTimeout(fetchCouriers, 300);
  //     return () => clearTimeout(timeoutId);
  // }, [courierSearchTerm]);

  // Заполнение формы данными при их получении
  useEffect(() => {
    if (bonusPricing && organizations.length > 0) {
      form.reset({
        name: bonusPricing.name || "",
        organization_id: bonusPricing.organization_id || "",
        pricing: bonusPricing.pricing || [
          {
            terminal_ids: [],
            courier_id: "",
            rules: [
              {
                distance_from: 0,
                distance_to: 0,
                time_from: 0,
                time_to: 0,
                price: 0,
              }
            ]
          }
        ],
      });
    }
  }, [JSON.stringify(bonusPricing), JSON.stringify(organizations), form]);

  // Обработка отправки формы
  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.api.constructed_bonus_pricing({ id }).put({
        data: values,
      });
      
      toast.success("Условие бонуса к заказу успешно обновлено");
      router.push("/dashboard/constructed_bonus_pricing");
    } catch (error) {
      toast.error("Ошибка обновления условия бонуса к заказу");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция для добавления правила к ценовой категории
  const addRule = (pricingIndex: number) => {
    const pricing = form.getValues().pricing;
    const updatedPricing = [...pricing];
    
    if (!updatedPricing[pricingIndex].rules) {
      updatedPricing[pricingIndex].rules = [];
    }
    
    updatedPricing[pricingIndex].rules.push({
      distance_from: 0,
      distance_to: 0,
      time_from: 0,
      time_to: 0,
      price: 0,
    });
    
    form.setValue("pricing", updatedPricing);
  };

  // Функция для удаления правила из ценовой категории
  const removeRule = (pricingIndex: number, ruleIndex: number) => {
    const pricing = form.getValues().pricing;
    const updatedPricing = [...pricing];
    
    if (updatedPricing[pricingIndex].rules.length > 1) {
      updatedPricing[pricingIndex].rules.splice(ruleIndex, 1);
      form.setValue("pricing", updatedPricing);
    } else {
      toast.error("Необходимо оставить хотя бы одно правило");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/dashboard/constructed_bonus_pricing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Link>
          </Button>
        </div>
        <ConstructedBonusPricingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/constructed_bonus_pricing">
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
              </div>

              <div className="space-y-4">
                <div className="font-medium">Ценовые категории</div>
                
                {pricingFields.map((pricingField, pricingIndex) => (
                  <Card key={pricingField.id} className="border p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Категория {pricingIndex + 1}</h4>
                      {pricingFields.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removePricing(pricingIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <FormField
                        control={form.control}
                        name={`pricing.${pricingIndex}.terminal_ids`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Филиалы</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                // Для поддержки множественного выбора
                                const currentValues = field.value || [];
                                if (currentValues.includes(value)) {
                                  field.onChange(currentValues.filter(v => v !== value));
                                } else {
                                  field.onChange([...currentValues, value]);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите филиалы" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {terminals.map((terminal) => (
                                  <SelectItem key={terminal.id} value={terminal.id}>
                                    {terminal.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="mt-2">
                              {field.value && field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {field.value.map((terminalId) => {
                                    const terminal = terminals.find(t => t.id === terminalId);
                                    return terminal ? (
                                      <div key={terminalId} className="bg-muted rounded-md px-2 py-1 text-xs flex items-center">
                                        {terminal.name}
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-4 w-4 ml-1 p-0"
                                          onClick={() => {
                                            field.onChange(field.value?.filter(id => id !== terminalId));
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* <FormField
                        control={form.control}
                        name={`pricing.${pricingIndex}.courier_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Курьер</FormLabel>
                            <div className="flex space-x-2">
                              <Input 
                                placeholder="Поиск курьера" 
                                value={courierSearchTerm}
                                onChange={(e) => setCourierSearchTerm(e.target.value)} 
                                className="flex-1"
                              />
                            </div>
                            {couriers.length > 0 && (
                              <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                                {couriers.map((courier) => (
                                  <div 
                                    key={courier.id} 
                                    className={`p-2 cursor-pointer hover:bg-muted ${field.value === courier.id ? 'bg-muted' : ''}`}
                                    onClick={() => field.onChange(courier.id)}
                                  >
                                    {courier.first_name} {courier.last_name} ({courier.phone})
                                  </div>
                                ))}
                              </div>
                            )}
                            {field.value && (
                              <div className="mt-2">
                                <div className="bg-muted rounded-md px-2 py-1 text-sm flex items-center">
                                  {couriers.find(c => c.id === field.value)?.first_name} {couriers.find(c => c.id === field.value)?.last_name}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-4 w-4 ml-1 p-0"
                                    onClick={() => field.onChange("")}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      /> */}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="font-medium">Условия</div>
                      
                      {form.getValues().pricing[pricingIndex].rules?.map((rule, ruleIndex) => (
                        <div key={ruleIndex} className="border p-4 rounded-md">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-medium">Условие {ruleIndex + 1}</h5>
                            {form.getValues().pricing[pricingIndex].rules.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeRule(pricingIndex, ruleIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <FormField
                              control={form.control}
                              name={`pricing.${pricingIndex}.rules.${ruleIndex}.distance_from`}
                              render={({ field }) => (
                                <FormItem>
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
                              name={`pricing.${pricingIndex}.rules.${ruleIndex}.distance_to`}
                              render={({ field }) => (
                                <FormItem>
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
                              name={`pricing.${pricingIndex}.rules.${ruleIndex}.time_from`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>От (мин)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} min={0} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`pricing.${pricingIndex}.rules.${ruleIndex}.time_to`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>До (мин)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} min={0} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`pricing.${pricingIndex}.rules.${ruleIndex}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Цена</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} min={0} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRule(pricingIndex)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить условие
                      </Button>
                    </div>
                  </Card>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendPricing({
                    terminal_ids: [],
                    courier_id: "",
                    rules: [
                      {
                        distance_from: 0,
                        distance_to: 0,
                        time_from: 0,
                        time_to: 0,
                        price: 0,
                      }
                    ]
                  })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить ценовую категорию
                </Button>
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