"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "../../../../lib/eden-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "../../../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { format } from "date-fns";

// Константа для преобразования технических идентификаторов типов оплаты в понятные названия
const PAYMENT_TYPE_NAMES = {
  cash: "Наличные",
  card: "Карта",
  client: "Клиент",
};

interface Organization {
  id: string;
  name: string;
  active: boolean;
  allow_yandex_delivery: boolean;
  created_at: string;
  phone: string;
  webhook: string;
  system_type: string;
  payment_type: string;
  external_id: string;
  support_chat_url: string;
  max_distance: number;
  max_order_close_distance: number;
  max_active_order_count: number;
  group_id: string;
  apelsin_login: string;
  apelsin_password: string;
  sender_name: string;
  sender_number: string;
  description: string;
  iiko_login: string;
  icon_url: string;
}

export default function OrganizationShow() {
  const params = useParams();
  const id = params.id as string;
  
  // Fetch organization data
  const { data: organization, isLoading } = useQuery({
    queryKey: ["organization", id],
    queryFn: async () => {
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

  if (isLoading) {
    return <OrganizationSkeleton />;
  }

  const org = organization as Organization;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/organization">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to organizations
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/organization/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{org?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Основная информация</TabsTrigger>
              <TabsTrigger value="technical">Технические данные</TabsTrigger>
              <TabsTrigger value="payment">Оплата и доставка</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Активность</h3>
                  <div className="mt-1">
                    <Switch checked={org?.active} disabled className="ml-2" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Яндекс доставка</h3>
                  <div className="mt-1">
                    <Switch checked={org?.allow_yandex_delivery} disabled className="ml-2" />
                  </div>
                </div>
                
                {org?.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Телефон</h3>
                    <p className="mt-1">{org.phone}</p>
                  </div>
                )}
                
                {org?.created_at && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                    <p className="mt-1">
                      {format(new Date(org.created_at), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                )}
                
                {org?.icon_url && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Логотип</h3>
                    <div className="mt-2">
                      <img src={org.icon_url} alt="Organization Logo" className="max-w-xs h-auto rounded" />
                    </div>
                  </div>
                )}
                
                {org?.description && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Описание</h3>
                    <p className="mt-1 whitespace-pre-wrap">{org.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="technical" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {org?.system_type && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Тип системы</h3>
                    <p className="mt-1">{org.system_type}</p>
                  </div>
                )}
                
                {org?.iiko_login && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Iiko логин</h3>
                    <p className="mt-1">{org.iiko_login}</p>
                  </div>
                )}
                
                {org?.webhook && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Вебхук</h3>
                    <p className="mt-1 break-all">{org.webhook}</p>
                  </div>
                )}
                
                {org?.external_id && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Внешний ID</h3>
                    <p className="mt-1">{org.external_id}</p>
                  </div>
                )}
                
                {org?.group_id && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">ID группы</h3>
                    <p className="mt-1">{org.group_id}</p>
                  </div>
                )}
                
                {org?.support_chat_url && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Ссылка на чат поддержки</h3>
                    <p className="mt-1 break-all">{org.support_chat_url}</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="payment" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {org?.payment_type && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Тип оплаты</h3>
                    <p className="mt-1">{PAYMENT_TYPE_NAMES[org.payment_type as keyof typeof PAYMENT_TYPE_NAMES] || org.payment_type}</p>
                  </div>
                )}
                
                {org?.max_distance !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Макс. расстояние открытия</h3>
                    <p className="mt-1">{org.max_distance}</p>
                  </div>
                )}
                
                {org?.max_order_close_distance !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Макс. расстояние закрытия</h3>
                    <p className="mt-1">{org.max_order_close_distance}</p>
                  </div>
                )}
                
                {org?.max_active_order_count !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Макс. количество активных заказов</h3>
                    <p className="mt-1">{org.max_active_order_count}</p>
                  </div>
                )}
                
                {org?.apelsin_login && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Логин Апельсин</h3>
                    <p className="mt-1">{org.apelsin_login}</p>
                  </div>
                )}
                
                {org?.sender_name && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Имя отправителя</h3>
                    <p className="mt-1">{org.sender_name}</p>
                  </div>
                )}
                
                {org?.sender_number && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Номер отправителя</h3>
                    <p className="mt-1">{org.sender_number}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="h-10 w-1/4 bg-gray-200 animate-pulse rounded mb-6"></div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-4 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div>
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 