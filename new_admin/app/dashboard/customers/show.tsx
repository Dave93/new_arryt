"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiClient } from "../../../lib/eden-client";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useState } from "react";


export default function CustomersShow() {
  const params = useParams();
  const customerId = params.id as string;
  
  const { data: data, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      try {
        const response = await apiClient.api.customers({id:customerId}).get();
        
        return response.data;
      } catch (error) {
        toast.error("Failed to fetch customer details", {
          description: "There was an error loading the customer information. Please try again.",
        });
        throw error;
      }
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return <CustomerSkeleton />;
  }

  const customer = data?.data;

  return (
      <Card>
        <CardHeader>
          <CardTitle>Информация о клиенте</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="info" className="w-full">
            <TabsList>
              <TabsTrigger value="info">Основная информация</TabsTrigger>
              <TabsTrigger value="orders">Заказы</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Ф.И.О.</h3>
                  <p className="text-gray-700">{customer?.name}</p>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">Телефон</h3>
                  <p className="text-gray-700">{customer?.phone}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Комментарии</h3>
                  <p className="text-gray-500 italic">Нет комментариев</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="orders" className="mt-6">
              <CustomerOrders customerId={customerId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
  );
}

function CustomerOrders({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["customer-orders", customerId, page],
    queryFn: async () => {
      const filters = [
        {
          field: "customer_id",
          operator: "eq",
          value: customerId,
        },
      ];

      const response = await apiClient.api.orders.get({
        query: {
          fields: [
            "id",
            "order_number",
            "created_at",
            "order_price",
            "delivery_price",
            "payment_type",
            "order_status.id",
            "order_status.name",
            "order_status.color",
            "terminals.id",
            "terminals.name",
          ].join(","),
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
          filters: JSON.stringify(filters),
        },
      });

      return {
        total: response.data?.total || 0,
        data: (response.data?.data || []) as any[],
      };
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const orders = ordersData?.data || [];
  const total = ordersData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (orders.length === 0) {
    return <p className="text-gray-500">У клиента нет заказов</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Всего заказов: {total}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>№ заказа</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Филиал</TableHead>
            <TableHead>Сумма заказа</TableHead>
            <TableHead>Доставка</TableHead>
            <TableHead>Оплата</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: any) => (
            <TableRow
              key={order.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
            >
              <TableCell className="font-medium">{order.order_number}</TableCell>
              <TableCell>
                {order.created_at ? format(new Date(order.created_at), "dd.MM.yyyy HH:mm") : "—"}
              </TableCell>
              <TableCell>{order.terminals?.name || "—"}</TableCell>
              <TableCell>
                {order.order_price
                  ? new Intl.NumberFormat("ru-RU").format(order.order_price)
                  : "—"}
              </TableCell>
              <TableCell>
                {order.delivery_price
                  ? new Intl.NumberFormat("ru-RU").format(order.delivery_price)
                  : "—"}
              </TableCell>
              <TableCell>{order.payment_type || "—"}</TableCell>
              <TableCell>
                {order.order_status ? (
                  <Badge
                    style={{
                      backgroundColor: order.order_status.color || "#ccc",
                      color: "#fff",
                    }}
                  >
                    {order.order_status.name}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Страница {page + 1} из {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerSkeleton() {
  return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/4 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3 mt-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
} 