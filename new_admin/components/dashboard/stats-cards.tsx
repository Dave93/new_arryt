"use client"

import { IconTrendingUp, IconTruck, IconCash, IconPackage } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"
import { useSearchParams } from "next/navigation"

export function DashboardStatsCards() {
  const searchParams = useSearchParams()
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const region = searchParams.get("region")
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", startDate, endDate, region],
    queryFn: async () => {
      const response = await apiClient.api.dashboard.stats.get({
        query: {
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate }),
          ...(region && { region: region })
        }
      })
      if (response.error) throw response.error
      return response.data
    },
    refetchInterval: 30000 // обновлять каждые 30 секунд
  })

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Заказов сегодня</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "..." : stats?.totalOrders || 0}
          </CardTitle>
          <CardAction>
            <IconPackage className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Общее количество заказов за выбранный период
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Активные курьеры</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "..." : stats?.activeCouriers || 0}
          </CardTitle>
          <CardAction>
            <IconTruck className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Курьеры онлайн в данный момент
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Средняя стоимость доставки</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "..." : formatCurrency(stats?.avgDeliveryPrice || 0)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Сегодня
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Средняя стоимость доставки за период
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Выручка за период</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "..." : formatCurrency(stats?.todayRevenue || 0)}
          </CardTitle>
          <CardAction>
            <IconCash className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Общая сумма заказов за период
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}