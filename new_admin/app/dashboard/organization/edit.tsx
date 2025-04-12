"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../../lib/eden-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
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
import { Switch } from "../../../components/ui/switch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";

// Определяем типы для платежей и систем
const PAYMENT_TYPES = {
  cash: "Наличные",
  card: "Карта",
  client: "Клиент",
};

const SYSTEM_TYPES = {
  iiko: "iiko",
  r_keeper: "r_keeper",
  jowi: "jowi",
};

// Define the form schema with validation
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(false),
  allow_yandex_delivery: z.boolean().default(false),
  phone: z.string().optional(),
  system_type: z.enum(["iiko", "r_keeper", "jowi"]).optional(),
  webhook: z.string().optional(),
  payment_type: z.enum(["cash", "card", "client"]).optional(),
  external_id: z.string().optional(),
  support_chat_url: z.string().optional(),
  max_distance: z.number().optional(),
  max_order_close_distance: z.number().optional(),
  max_active_order_count: z.number().optional(),
  group_id: z.string().optional(),
  apelsin_login: z.string().optional(),
  apelsin_password: z.string().optional(),
  sender_name: z.string().optional(),
  sender_number: z.string().optional(),
  description: z.string().optional(),
  iiko_login: z.string().optional(),
  icon_url: z.string().optional(),
});

export default function OrganizationEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      name: "",
      active: false,
      allow_yandex_delivery: false,
      phone: "",
      system_type: "iiko",
      webhook: "",
      payment_type: "cash",
      external_id: "",
      support_chat_url: "",
      group_id: "",
      apelsin_login: "",
      apelsin_password: "",
      sender_name: "",
      sender_number: "",
      description: "",
      iiko_login: "",
      icon_url: "",
    },
  });

  // Fetch organization data
  const { data: organization, isLoading } = useQuery({
    queryKey: ["organizationEdit", id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const response = await apiClient.api.organization({id}).get();
        
        return response?.data?.data;
      } catch (error) {
        toast.error("Failed to fetch organization", {
          description: "There was an error loading the organization. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!id,
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (organization) {
      console.log("Organization data:", organization);
      console.log("Payment type:", organization.payment_type);
      console.log("System type:", organization.system_type);
      
      // Преобразуем payment_type и system_type к формату, который соответствует нашим ключам
      let systemType = organization.system_type || "";
      let paymentType = organization.payment_type || "";
      
      // Проверяем, существует ли значение в наших объектах, иначе пытаемся привести к нижнему регистру
      if (!Object.keys(SYSTEM_TYPES).includes(systemType)) {
        systemType = systemType.toLowerCase() as keyof typeof SYSTEM_TYPES;
      }
      
      if (!Object.keys(PAYMENT_TYPES).includes(paymentType)) {
        paymentType = paymentType.toLowerCase() as keyof typeof PAYMENT_TYPES;
      }
      
      form.reset({
        id: organization.id,
        name: organization.name,
        active: organization.active,
        allow_yandex_delivery: organization.allow_yandex_delivery,
        phone: organization.phone || "",
        system_type: systemType,
        webhook: organization.webhook || "",
        payment_type: paymentType,
        external_id: organization.external_id || "",
        support_chat_url: organization.support_chat_url || "",
        max_distance: organization.max_distance,
        max_order_close_distance: organization.max_order_close_distance,
        max_active_order_count: organization.max_active_order_count,
        group_id: organization.group_id || "",
        apelsin_login: organization.apelsin_login || "",
        apelsin_password: organization.apelsin_password || "",
        sender_name: organization.sender_name || "",
        sender_number: organization.sender_number || "",
        description: organization.description || "",
        iiko_login: organization.iiko_login || "",
        icon_url: organization.icon_url || "",
      });

      // Принудительно обновляем значения в форме после установки
      setTimeout(() => {
        form.setValue("system_type", systemType);
        form.setValue("payment_type", paymentType);
      }, 0);
    }
  }, [organization, form]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // @ts-ignore
      await apiClient.api.organization({id}).put({
        // @ts-ignore
        data: values,
      });
      
      toast.success("Organization updated successfully");
      router.push("/dashboard/organization");
    } catch (error) {
      toast.error("Failed to update organization", {
        description: "There was an error updating the organization. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            
            <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
            
            <div className="h-10 w-[100px] bg-gray-200 animate-pulse rounded mt-6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/dashboard/organization">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to organizations
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>
            Update organization details in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активность</FormLabel>
                        <FormDescription>
                          Активна ли организация в системе
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
                  name="allow_yandex_delivery"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Яндекс доставка</FormLabel>
                        <FormDescription>
                          Включить Яндекс доставку для организации
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

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input placeholder="Название организации" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl>
                      <Input placeholder="Телефон организации" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL логотипа</FormLabel>
                    <FormControl>
                      <Input placeholder="URL логотипа организации" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ссылка на изображение логотипа
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="system_type"
                  render={({ field }) => {
                    return (
                    <FormItem>
                      <FormLabel>Тип системы</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип системы">
                              {field.value ? SYSTEM_TYPES[field.value as keyof typeof SYSTEM_TYPES] || field.value : "Выберите тип системы"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SYSTEM_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}}
                />

                <FormField
                  control={form.control}
                  name="iiko_login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Iiko логин</FormLabel>
                      <FormControl>
                        <Input placeholder="Iiko логин" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => {
                  return (
                  <FormItem>
                    <FormLabel>Тип оплаты</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип оплаты">
                            {field.value ? PAYMENT_TYPES[field.value as keyof typeof PAYMENT_TYPES] || field.value : "Выберите тип оплаты"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}}
              />

              <FormField
                control={form.control}
                name="external_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Внешний ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Внешний ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="support_chat_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ссылка на чат колл-центра</FormLabel>
                    <FormControl>
                      <Input placeholder="Ссылка на чат колл-центра" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="max_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Макс. расстояние открытия</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Для открытия рабочего дня
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_order_close_distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Макс. расстояние закрытия</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Для закрытия заказа
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_active_order_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Макс. активных заказов</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="webhook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вебхук</FormLabel>
                      <FormControl>
                        <Input placeholder="Вебхук" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID группы</FormLabel>
                      <FormControl>
                        <Input placeholder="ID группы" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="apelsin_login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Логин Апельсин</FormLabel>
                      <FormControl>
                        <Input placeholder="Логин Апельсин" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apelsin_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль Апельсин</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Пароль Апельсин" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sender_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя отправителя</FormLabel>
                      <FormControl>
                        <Input placeholder="Имя отправителя" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sender_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер отправителя</FormLabel>
                      <FormControl>
                        <Input placeholder="Номер отправителя" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Описание организации"
                        rows={6}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Organization"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 