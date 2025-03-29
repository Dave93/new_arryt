"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { format } from "date-fns";

// Интерфейсы для типизации данных
interface Rule {
  distance_from: number;
  distance_to: number;
  time_from: number;
  time_to: number;
  price: number;
}

interface PricingItem {
  terminal_ids?: string[];
  courier_id?: string;
  rules: Rule[];
  terminals?: { id: string; name: string }[];
  courier?: { id: string; first_name: string; last_name: string; phone: string };
}

interface ConstructedBonusPricing {
  id: string;
  name: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
  };
  created_at: string;
  pricing: PricingItem[];
}

// Скелетон для состояния загрузки
function ConstructedBonusPricingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div>
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConstructedBonusPricingShow() {
  const params = useParams();
  const id = params.id as string;
  const authHeaders = useGetAuthHeaders();
  const [terminalsMap, setTerminalsMap] = useState<Record<string, string>>({});

  // Запрос данных для просмотра
  const { data: bonusPricing, isLoading } = useQuery<ConstructedBonusPricing | null>({
    queryKey: ["constructedBonusPricing", id],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.constructed_bonus_pricing({ id }).get({
          headers: authHeaders,
        });
        return data?.data as ConstructedBonusPricing;
      } catch (error) {
        toast.error("Ошибка загрузки данных условия бонуса к заказу");
        console.error(error);
        return null;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  // Загрузка названий терминалов
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        const terminalsResponse = await apiClient.api.terminals.cached.get({
          headers: authHeaders,
        });
        
        if (terminalsResponse.data && Array.isArray(terminalsResponse.data)) {
          const map: Record<string, string> = {};
          terminalsResponse.data.forEach((terminal: { id: string; name: string }) => {
            map[terminal.id] = terminal.name;
          });
          setTerminalsMap(map);
        }
      } catch (error) {
        console.error("Ошибка загрузки терминалов:", error);
      }
    };

    if (authHeaders && bonusPricing) {
      fetchTerminals();
    }
  }, [authHeaders, bonusPricing]);

  // Загрузка данных о курьерах
  // useEffect(() => {
  //   const fetchCourierDetails = async () => {
  //     if (!bonusPricing?.pricing) return;
      
  //     const updatedPricing = [...bonusPricing.pricing];
  //     let hasChanges = false;
      
  //     for (let i = 0; i < updatedPricing.length; i++) {
  //       if (updatedPricing[i].courier_id && !updatedPricing[i].courier) {
  //         try {
  //           const response = await apiClient.api.couriers({ id: updatedPricing[i]?.courier_id}).get({
  //             headers: authHeaders,
  //           });
            
  //           if (response.data) {
  //             updatedPricing[i].courier = response.data;
  //             hasChanges = true;
  //           }
  //         } catch (error) {
  //           console.error("Ошибка при загрузке данных курьера:", error);
  //         }
  //       }
  //     }
      
  //     // Обновляем состояние, если были изменения
  //     if (hasChanges && bonusPricing) {
  //       // Этот объект не меняет состояние напрямую, но в реальном приложении
  //       // здесь бы использовался setState или другой метод обновления состояния
  //     }
  //   };
    
  //   if (bonusPricing && authHeaders) {
  //     fetchCourierDetails();
  //   }
  // }, [bonusPricing, authHeaders]);

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

  if (!bonusPricing) {
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
          <CardContent className="flex flex-col items-center justify-center h-40">
            <p className="text-muted-foreground">Данные не найдены</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/constructed_bonus_pricing">
                Вернуться к списку
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/constructed_bonus_pricing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/constructed_bonus_pricing/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{bonusPricing.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Основная информация</TabsTrigger>
              <TabsTrigger value="pricing">Ценовые категории</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Организация</h3>
                  <p className="mt-1">{bonusPricing.organization?.name || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                  <p className="mt-1">{format(new Date(bonusPricing.created_at), "dd.MM.yyyy HH:mm")}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="pricing" className="mt-4">
              <div className="space-y-6">
                {bonusPricing.pricing.map((pricingItem, index) => (
                  <Card key={index} className="border">
                    <CardHeader>
                      <CardTitle className="text-base">Категория {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Филиалы</h3>
                          <div className="mt-1">
                            {pricingItem.terminal_ids && pricingItem.terminal_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {pricingItem.terminal_ids.map((terminalId) => (
                                  <div key={terminalId} className="bg-muted rounded-md px-2 py-1 text-xs">
                                    {terminalsMap[terminalId] || terminalId}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">Не указаны</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Курьер</h3>
                          <p className="mt-1">
                            {pricingItem.courier ? 
                              `${pricingItem.courier.first_name} ${pricingItem.courier.last_name} (${pricingItem.courier.phone})` : 
                              "Не указан"}
                          </p>
                        </div>
                      </div>
                      
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Условия</h3>
                      <div className="space-y-4">
                        {pricingItem.rules.map((rule, ruleIndex) => (
                          <div key={ruleIndex} className="border p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">От (км)</h4>
                                <p>{rule.distance_from}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">До (км)</h4>
                                <p>{rule.distance_to}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">От (мин)</h4>
                                <p>{rule.time_from}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">До (мин)</h4>
                                <p>{rule.time_to}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">Цена</h4>
                                <p>{new Intl.NumberFormat("ru-RU").format(rule.price)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 