"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"

export function TopLists() {
  const searchParams = useSearchParams()
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const region = searchParams.get("region")

  const { data: topTerminals } = useQuery({
    queryKey: ["dashboard-top-terminals", startDate, endDate, region],
    queryFn: async () => {
      const response = await apiClient.api.dashboard["top-terminals"].get({
        query: {
          limit: 5,
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate }),
          ...(region && { region: region })
        }
      })
      if (response.error) throw response.error
      return response.data
    }
  })

  const { data: topCouriers } = useQuery({
    queryKey: ["dashboard-top-couriers", startDate, endDate, region],
    queryFn: async () => {
      const response = await apiClient.api.dashboard["top-couriers"].get({
        query: {
          limit: 5,
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate }),
          ...(region && { region: region })
        }
      })
      if (response.error) throw response.error
      return response.data
    }
  })

  const formatCurrency = (value: number | string | null) => {
    if (!value) return "0 UZS"
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "?"
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Топ терминалов</CardTitle>
          <CardDescription>
            По количеству заказов за выбранный период
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topTerminals?.map((terminal, index) => (
              <div key={terminal.terminalId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{terminal.terminalName}</p>
                    <p className="text-sm text-muted-foreground">
                      {terminal.orderCount} заказов
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(terminal.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">выручка</p>
                </div>
              </div>
            ))}
            {!topTerminals || topTerminals.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Нет данных</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Топ курьеров</CardTitle>
          <CardDescription>
            По количеству доставок за выбранный период
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCouriers?.map((courier) => (
              <div key={courier.courierId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>
                      {getInitials(courier.courierFirstName, courier.courierLastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {courier.courierFirstName} {courier.courierLastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {courier.orderCount} доставок
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(courier.totalDelivered)}</p>
                  <p className="text-sm text-muted-foreground">
                    ~{Math.round(Number(courier.avgDeliveryTime) || 0)} мин/заказ
                  </p>
                </div>
              </div>
            ))}
            {!topCouriers || topCouriers.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Нет данных</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}