"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import { DynamicMap } from "../../../../components/dynamic-map";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";

// Определение типа терминала
interface Terminal {
  id: string;
  name: string;
  active: boolean;
  allow_close_anywhere: boolean;
  created_at: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  phone: string;
  latitude: number;
  longitude: number;
  external_id: string;
  manager_name: string;
  address: string;
  fuel_bonus: boolean;
  time_to_yandex: number;
  region: string;
}

export default function TerminalDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const authHeaders = useGetAuthHeaders();
  
  // Загрузка данных терминала
  const { data: terminal, isLoading } = useQuery({
    queryKey: ["terminal", id],
    queryFn: async () => {
      try {
        const {data:response} = await apiClient.api.terminals({id}).get({
          headers: authHeaders,
        });
        // @ts-ignore
        return response?.data as Terminal;
      } catch (error) {
        toast.error("Failed to fetch terminal details");
        router.push("/dashboard/terminals");
        return null;
      }
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <TerminalSkeleton />;
  }

  if (!terminal) {
    return null;
  }

  const regionMap: Record<string, string> = {
    capital: "Столица",
    region: "Регион"
  };

  console.log('terminal', terminal)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/terminals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/terminals/edit?id=${terminal.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{terminal.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Основная информация</TabsTrigger>
              <TabsTrigger value="location">Местоположение</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Организация</h3>
                  <p className="mt-1">{terminal.organization?.name || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                  <p className="mt-1">{format(new Date(terminal.created_at), "dd.MM.yyyy HH:mm")}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Телефон</h3>
                  <p className="mt-1">{terminal.phone || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Менеджер</h3>
                  <p className="mt-1">{terminal.manager_name || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Внешний идентификатор</h3>
                  <p className="mt-1">{terminal.external_id || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Региональность</h3>
                  <p className="mt-1">{regionMap[terminal.region] || terminal.region || "-"}</p>
                </div>
              </div>
              
              {terminal.address && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground">Адрес</h3>
                  <p className="mt-1">{terminal.address}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="location" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Широта</h3>
                  <p className="mt-1">{terminal.latitude}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Долгота</h3>
                  <p className="mt-1">{terminal.longitude}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Карта</h3>
                <DynamicMap 
                  latitude={terminal.latitude} 
                  longitude={terminal.longitude} 
                  name={terminal.name}
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Активность</h3>
                    <p className="text-sm text-muted-foreground">Филиал активен и может принимать заказы</p>
                  </div>
                  <Switch checked={terminal.active} disabled />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Разрешить закрытие заказа в любом месте</h3>
                    <p className="text-sm text-muted-foreground">Позволяет закрывать заказы вне зоны филиала</p>
                  </div>
                  <Switch checked={terminal.allow_close_anywhere} disabled />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Выдавать на топливо</h3>
                    <p className="text-sm text-muted-foreground">Разрешает выдачу бонусов на топливо</p>
                  </div>
                  <Switch checked={terminal.fuel_bonus} disabled />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Минуты до отправки Яндексом</h3>
                  <p className="mt-1">{terminal.time_to_yandex || 15}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Компонент скелетона для состояния загрузки
function TerminalSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-1/4 mb-6" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <div className="mt-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 