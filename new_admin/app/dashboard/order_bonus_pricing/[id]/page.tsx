"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { apiClient } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";

interface OrderBonusPricing {
  id: string;
  name: string;
  active: boolean;
  organization_id: string;
  organization?: {
    id: string;
    name: string;
  };
  terminal_id: string | null;
  terminal?: {
    id: string;
    name: string;
  };
  max_order_time: number | null;
  min_distance_km: number | null;
  rules: Array<{
    from: number;
    to: number;
    price: number;
  }>;
  created_at: string;
}

export default function OrderBonusPricingDetail() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: bonusPricing, isLoading } = useQuery<OrderBonusPricing>({
    queryKey: ["orderBonusPricing", id],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.order_bonus_pricing({id}).get();
        return data?.data as OrderBonusPricing;
      } catch (error) {
        toast.error("Ошибка загрузки данных бонуса");
        throw error;
      }
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!bonusPricing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <h3 className="text-lg font-medium">Данные не найдены</h3>
            <p className="text-muted-foreground mt-2">
              Информация о бонусе к заказу не найдена или недоступна
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/order_bonus_pricing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться к списку
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/order_bonus_pricing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/order_bonus_pricing/edit?id=${bonusPricing.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{bonusPricing.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Активен</span>
            <Switch checked={bonusPricing.active} disabled />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Детали</TabsTrigger>
              <TabsTrigger value="rules">Правила расчета</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Организация</h3>
                  <p className="mt-1">{bonusPricing.organization?.name || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Филиал</h3>
                  <p className="mt-1">{bonusPricing.terminal?.name || "Не указан"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Максимальное время доставки</h3>
                  <p className="mt-1">{bonusPricing.max_order_time ? `${bonusPricing.max_order_time} мин.` : "Не указано"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Минимальная дистанция</h3>
                  <p className="mt-1">{bonusPricing.min_distance_km ? `${bonusPricing.min_distance_km} м.` : "Не указано"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                  <p className="mt-1">{format(new Date(bonusPricing.created_at), "dd.MM.yyyy HH:mm")}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="rules" className="mt-4">
              {bonusPricing.rules && bonusPricing.rules.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 font-medium text-sm text-muted-foreground px-4">
                    <div>От (км)</div>
                    <div>До (км)</div>
                    <div>Цена</div>
                  </div>
                  {bonusPricing.rules.map((rule, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 p-4 border rounded-md">
                      <div>{rule.from}</div>
                      <div>{rule.to}</div>
                      <div>{new Intl.NumberFormat("ru-RU").format(rule.price)} сум</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Правила расчета не заданы</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-1/4 mb-6" />
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div>
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 