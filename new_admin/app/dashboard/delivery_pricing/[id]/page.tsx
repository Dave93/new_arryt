"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { apiClient } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { format } from "date-fns";
import { Separator } from "../../../../components/ui/separator";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

// Дни недели
const daysOfWeek = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

// Типы видов передвижения
const driveTypeMap = {
  car: "Автомобиль",
  foot: "Пешком",
  bike: "Велосипед",
  scooter: "Самокат",
};

// Типы оплаты
const paymentTypeMap = {
  cash: "Наличные",
  card: "Карта",
  both: "Оба",
};

export default function DeliveryPricingDetail() {
  const params = useParams();
  const id = params.id as string;
  const [distance, setDistance] = useState<string>("");
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculatedClientPrice, setCalculatedClientPrice] = useState<number | null>(null);
  
  // Загрузка данных
  const { data, isLoading } = useQuery({
    queryKey: ["deliveryPricing", id],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.delivery_pricing({id}).get();
        return response?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных");
        throw error;
      }
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DeliveryPricingDetailSkeleton />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">Данные не найдены</p>
        </CardContent>
      </Card>
    );
  }

  // Функция для расчета стоимости доставки
  const calculatePrice = (distanceKm: number) => {
    if (!data) return;

    // Расчет цены для курьера
    let courierPrice = data.min_price;
    // @ts-ignore
    if (data.rules && data.rules.length > 0) {
      // Поиск правила, которое соответствует дистанции
      // @ts-ignore
      const rule = data.rules.find((r: { from: number, to: number }) => distanceKm >= r.from && distanceKm <= r.to);
      
      if (rule) {
        courierPrice = rule.price;
      } else {
        courierPrice = (data?.min_price || 0) + (distanceKm * (data?.price_per_km || 0));
      }
    } else {
      courierPrice = (data?.min_price || 0) + (distanceKm * (data?.price_per_km || 0));
    }
    
    // Расчет цены для клиента
    let clientPrice = 0;
    
    // @ts-ignore
    if (data?.client_rules && data?.client_rules.length > 0) {
      // Поиск правила, которое соответствует дистанции
      // @ts-ignore
      const rule = data?.client_rules.find((r: { from: number, to: number }) => distanceKm >= r.from && distanceKm <= r.to);
      
      if (rule) {
        clientPrice = rule.price;
        // @ts-ignore
      } else if (data?.client_price_per_km) {
        // @ts-ignore
        clientPrice = distanceKm * (data?.client_price_per_km || 0);
      }
      // @ts-ignore
    } else if (data?.client_price_per_km) {
      // @ts-ignore
      clientPrice = distanceKm * (data?.client_price_per_km || 0);
    }
    
    setCalculatedPrice(courierPrice);
    setCalculatedClientPrice(clientPrice);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/delivery_pricing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/delivery_pricing/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Детали</TabsTrigger>
              <TabsTrigger value="rules">Правила</TabsTrigger>
              <TabsTrigger value="client_rules">Правила клиента</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Статус</h3>
                    <div className="flex items-center mt-1">
                      <Switch checked={data.active} disabled className="mr-2" />
                      <span>{data.active ? "Активно" : "Неактивно"}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">По-умолчанию</h3>
                    <div className="flex items-center mt-1">
                      <Switch checked={data.default} disabled className="mr-2" />
                      <span>{data.default ? "Да" : "Нет"}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Организация</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{data?.organization?.name || "-"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Филиал</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{data?.terminal?.name || "Все филиалы"}</p>
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Вид передвижения</h3>
                    {/* @ts-ignore */}
                    <p className="mt-1">{driveTypeMap[data.drive_type as keyof typeof driveTypeMap] || data.drive_type}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Минимальная цена</h3>
                    <p className="mt-1">{data.min_price}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Цена за километр</h3>
                    <p className="mt-1">{data.price_per_km}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Тип оплаты</h3>
                    <p className="mt-1">{paymentTypeMap[data.payment_type as keyof typeof paymentTypeMap] || "-"}</p>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Источник заказа</h3>
                  {/* @ts-ignore */}
                  <p>{data.order_source || "-"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Минимальная дистанция</h3>
                  {/* @ts-ignore */}
                  <p>{data.min_distance ? `${data.min_distance} м` : "-"}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Дата создания</h3>
                <p>{format(new Date(data.created_at), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="mt-4 space-y-4">
              {/* @ts-ignore */}
              {data.rules && data.rules.length > 0 ? (
                <>
                  <h3 className="text-sm font-medium">Правила ценообразования</h3>
                  <div className="space-y-4">
                    {/* @ts-ignore */}
                    {data.rules.map((rule: { from: number, to: number, price: number }, index: number) => (
                      <div key={index} className="grid grid-cols-3 gap-4 rounded-md border p-4">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">От (км)</h4>
                          <p className="mt-1">{rule.from}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">До (км)</h4>
                          <p className="mt-1">{rule.to}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">Цена</h4>
                          <p className="mt-1">{rule.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-md mt-6">
                    <h3 className="text-sm font-medium mb-2">Логика расчета стоимости доставки:</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Для расстояний, указанных в правилах, используется фиксированная цена из правила.</li>
                      <li>Для остальных расстояний: Базовая стоимость + (расстояние в км × цена за км)</li>
                      <li>Если итоговая цена ниже минимальной, используется минимальная цена ({data.min_price})</li>
                      <li>Базовая стоимость = Минимальная цена ({data.min_price})</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Для этого условия не заданы правила фиксированной цены.</p>
                  
                  <div className="bg-muted/50 p-4 rounded-md mt-2">
                    <h3 className="text-sm font-medium mb-2">Логика расчета стоимости доставки:</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Базовая стоимость + (расстояние в км × цена за км)</li>
                      <li>Если итоговая цена ниже минимальной, используется минимальная цена ({data.min_price})</li>
                      <li>Базовая стоимость = Минимальная цена ({data.min_price})</li>
                      <li>Цена за километр: {data.price_per_km}</li>
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="client_rules" className="mt-4 space-y-4">
              <h3 className="text-sm font-medium mb-3">Цена за километр для клиента</h3>
              {/* @ts-ignore */}
              <p className="mb-4">{data.client_price_per_km || 0}</p>
              
              {/* @ts-ignore */}
              {data.client_rules && data.client_rules.length > 0 ? (
                <>
                  <h3 className="text-sm font-medium">Правила ценообразования для клиента</h3>
                  <div className="space-y-4">
                    {/* @ts-ignore */}
                    {data.client_rules.map((rule: { from: number, to: number, price: number }, index: number) => (
                      <div key={index} className="grid grid-cols-3 gap-4 rounded-md border p-4">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">От (км)</h4>
                          <p className="mt-1">{rule.from}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">До (км)</h4>
                          <p className="mt-1">{rule.to}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground">Цена</h4>
                          <p className="mt-1">{rule.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-md mt-6">
                    <h3 className="text-sm font-medium mb-2">Логика расчета стоимости доставки для клиента:</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Для расстояний, указанных в правилах, используется фиксированная цена из правила.</li>
                      <li>Для остальных расстояний: (расстояние в км × цена за км для клиента)</li>
                      {/* @ts-ignore */}
                      <li>Цена за километр для клиента: {data.client_price_per_km || 0}</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Для этого условия не заданы правила фиксированной цены для клиента.</p>
                  
                  <div className="bg-muted/50 p-4 rounded-md mt-2">
                    <h3 className="text-sm font-medium mb-2">Логика расчета стоимости доставки для клиента:</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Стоимость = расстояние в км × цена за км для клиента</li>
                      {/* @ts-ignore */}
                      <li>Цена за километр для клиента: {data.client_price_per_km || 0}</li>
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="mt-4 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Время начала</h3>
                    <p className="mt-1">{data.start_time}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Время окончания</h3>
                    <p className="mt-1">{data.end_time}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Дни недели</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(daysOfWeek).map(([key, value]) => {
                      // @ts-ignore
                      const day = parseInt(key);
                      // @ts-ignore
                      const isActive = data.days?.includes(day);
                      return (
                        <div key={key} className={`flex items-center rounded-md p-2 border ${isActive ? 'bg-primary/10 border-primary/30' : 'bg-muted/20 border-muted'}`}>
                          <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Калькулятор примерного расчёта</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="distance">Примерная дистанция (км)</Label>
              <div className="flex mt-2 space-x-2">
                <Input
                  id="distance"
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="Введите дистанцию"
                />
                <Button
                  onClick={() => {
                    const dist = parseFloat(distance);
                    if (!isNaN(dist) && dist >= 0) {
                      calculatePrice(dist);
                    }
                  }}
                >
                  Рассчитать
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Примерная цена для курьера</h3>
              <p className="text-lg font-medium">{calculatedPrice !== null ? `${calculatedPrice} ₽` : "-"}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Примерная цена для клиента</h3>
              <p className="text-lg font-medium">{calculatedClientPrice !== null ? `${calculatedClientPrice} ₽` : "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Компонент скелетона для страницы детального просмотра
function DeliveryPricingDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 max-w-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-10 w-[300px]" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-36 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
            
            <Skeleton className="h-[1px] w-full" />
            
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 