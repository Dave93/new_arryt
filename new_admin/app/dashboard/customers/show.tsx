"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "../../../lib/eden-client";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../../../components/ui/skeleton";


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
              <p className="text-gray-500">История заказов клиента будет доступна здесь</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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