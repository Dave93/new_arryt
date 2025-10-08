"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export function OrderCharts() {
  const searchParams = useSearchParams()
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const region = searchParams.get("region")
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")
  const [hiddenStatuses, setHiddenStatuses] = useState<Record<string, string[]>>({})
  
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch (period) {
      case "day":
        start.setDate(start.getDate() - 7)
        break
      case "week":
        start.setDate(start.getDate() - 30)
        break
      case "month":
        start.setMonth(start.getMonth() - 12)
        break
    }
    
    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }

  const { data: orderCounts } = useQuery({
    queryKey: ["dashboard-order-counts", period, region],
    queryFn: async () => {
      const { start_date, end_date } = getDateRange()
      const response = await apiClient.api.chart.orders_count_per_period.get({
        query: { 
          start_date, 
          end_date, 
          period,
          ...(region && { region: region })
        }
      })
      if (response.error) throw response.error
      return response.data
    }
  })

  const { data: deliveryTimes } = useQuery({
    queryKey: ["dashboard-delivery-times", period, region],
    queryFn: async () => {
      const { start_date, end_date } = getDateRange()
      const response = await apiClient.api.chart.delivery_time_per_period.get({
        query: { 
          start_date, 
          end_date, 
          period,
          ...(region && { region: region })
        }
      })
      if (response.error) throw response.error
      return response.data
    }
  })



  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    switch (period) {
      case "day":
        return format(date, "dd MMM", { locale: ru })
      case "week":
        return format(date, "dd MMM", { locale: ru })
      case "month":
        return format(date, "MMM yyyy", { locale: ru })
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  const handleLegendClick = (orgId: string, statusName: string) => {
    setHiddenStatuses(prev => {
      const orgHiddenStatuses = prev[orgId] || []
      if (orgHiddenStatuses.includes(statusName)) {
        return {
          ...prev,
          [orgId]: orgHiddenStatuses.filter(s => s !== statusName)
        }
      } else {
        return {
          ...prev,
          [orgId]: [...orgHiddenStatuses, statusName]
        }
      }
    })
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Количество заказов</CardTitle>
              <CardDescription>
                Динамика количества заказов по периодам
              </CardDescription>
            </div>
            <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">По дням</SelectItem>
                <SelectItem value="week">По неделям</SelectItem>
                <SelectItem value="month">По месяцам</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={orderCounts?.map((item: any) => ({
                date: formatDate(String(item.period)),
                count: item.count
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorOrders)"
                name="Заказов"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Среднее время доставки</CardTitle>
          <CardDescription>
            Среднее время доставки в минутах
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={deliveryTimes?.map((item: any) => ({
                date: formatDate(String(item.period)),
                time: Math.round(item.average_delivery_time || 0)
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="time" fill="#82ca9d" name="Минут" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  )
}