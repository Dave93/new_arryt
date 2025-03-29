"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { apiClient, useGetAuthHeaders } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { format } from "date-fns";

// Скелетон для состояния загрузки
function DailyGarantSkeleton() {
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
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyGarantShow() {
  const params = useParams();
  const id = params.id as string;
  const authHeaders = useGetAuthHeaders();
  
  // Запрос данных
  const { data: dailyGarant, isLoading } = useQuery({
    queryKey: ["dailyGarant", id],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.daily_garant({ id }).get({
          headers: authHeaders,
        });
        return data?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных дневного гаранта");
        console.error(error);
        throw error;
      }
    },
    enabled: !!id && !!authHeaders,
  });

  if (isLoading || !dailyGarant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/dashboard/daily_garant">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Link>
          </Button>
        </div>
        <DailyGarantSkeleton />
      </div>
    );
  }

  // Форматирование времени
  const timeDisplay = dailyGarant.date ? dailyGarant.date.substring(0, 5) : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/daily_garant">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/daily_garant/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dailyGarant.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Время начисления</h3>
                <p className="mt-1">{timeDisplay}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                <p className="mt-1">{format(new Date(dailyGarant.created_at), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Сумма гаранта</h3>
                <p className="mt-1">{new Intl.NumberFormat("ru-RU").format(dailyGarant.amount || 0)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Сумма штрафа</h3>
                <p className="mt-1">{new Intl.NumberFormat("ru-RU").format(dailyGarant.late_minus_sum || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 