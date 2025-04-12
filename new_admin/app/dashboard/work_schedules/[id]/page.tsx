"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs from "dayjs";

import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { apiClient } from "../../../../lib/eden-client";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { Badge } from "../../../../components/ui/badge";
import { format } from "date-fns";
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

// Mapping для дней недели
const daysOfWeekRu: Record<string, string> = {
  "1": "Понедельник",
  "2": "Вторник",
  "3": "Среда",
  "4": "Четверг",
  "5": "Пятница",
  "6": "Суббота",
  "7": "Воскресенье",
};

export default function WorkScheduleView() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: workSchedule, isLoading } = useQuery({
    queryKey: ["workSchedule", id],
    queryFn: async () => {
      try {
        const {data: response} = await apiClient.api.work_schedules({id}).get();
        return response?.data;
      } catch (error) {
        toast.error("Ошибка загрузки данных");
        throw error;
      }
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <WorkScheduleSkeleton />;
  }

  if (!workSchedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Рабочий график не найден</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Невозможно найти рабочий график с указанным ID.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/work_schedules">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/work_schedules">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/dashboard/work_schedules/edit?id=${id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{workSchedule.name}</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-muted-foreground mr-2">
              Активен:
            </div>
            <Switch 
              checked={workSchedule.active} 
              disabled 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Организация</h3>
                {/* @ts-ignore */}
                <p className="mt-1">{workSchedule.organization?.name || "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Дата создания</h3>
                <p className="mt-1">{format(new Date(workSchedule.created_at), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Рабочие дни</h3>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(workSchedule.days) && workSchedule.days.map((day: string) => (
                  <Badge key={day} variant="outline">
                    {daysOfWeekRu[day] || day}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Время начала</h3>
                <p className="mt-1">{workSchedule.start_time ? dayjs(workSchedule.start_time, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Время окончания</h3>
                <p className="mt-1">{workSchedule.end_time ? dayjs(workSchedule.end_time, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Макс. время начала</h3>
                <p className="mt-1">{workSchedule.max_start_time ? dayjs(workSchedule.max_start_time, "HH:mm:ss").add(5, "hours").format("HH:mm") : "-"}</p>
              </div>
            </div>
            
            {workSchedule.bonus_price !== undefined && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Бонусная сумма</h3>
                <p className="mt-1">{workSchedule.bonus_price}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Скелетон для загрузки
function WorkScheduleSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
          
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6 w-28" />
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 