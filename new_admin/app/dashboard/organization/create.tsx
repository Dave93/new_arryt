"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  name: z.string().min(1, { message: "Название обязательно" }),
  active: z.boolean().default(false),
  allow_yandex_delivery: z.boolean().default(false),
  phone: z.string().optional(),
  system_type: z.string().optional(),
  webhook: z.string().optional(),
  payment_type: z.string().optional(),
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
});

export default function OrganizationCreate() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      active: false,
      allow_yandex_delivery: false,
      phone: "",
      system_type: "",
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
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await apiClient.api.organization.post({
        // @ts-ignore
        data: values,
      });
      
      toast.success("Organization created successfully");
      router.push("/dashboard/organization");
    } catch (error) {
      toast.error("Failed to create organization", {
        description: "There was an error creating the organization. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <CardTitle>Create Organization</CardTitle>
          <CardDescription>
            Add a new organization to the system.
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
                {isSubmitting ? "Creating..." : "Create Organization"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 