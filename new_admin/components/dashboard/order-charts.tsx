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
    queryKey: ["dashboard-order-counts", period],
    queryFn: async () => {
      const { start_date, end_date } = getDateRange()
      const response = await apiClient.api.chart.orders_count_per_period.get({
        query: { start_date, end_date, period }
      })
      if (response.error) throw response.error
      return response.data
    }
  })

  const { data: deliveryTimes } = useQuery({
    queryKey: ["dashboard-delivery-times", period],
    queryFn: async () => {
      const { start_date, end_date } = getDateRange()
      const response = await apiClient.api.chart.delivery_time_per_period.get({
        query: { start_date, end_date, period }
      })
      if (response.error) throw response.error
      return response.data
    }
  })


  const { data: ordersByStatusAndOrg } = useQuery({
    queryKey: ["dashboard-orders-by-status-and-org", startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.api.dashboard["orders-by-status-and-org"].get({
        query: {
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate })
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
              data={orderCounts?.map(item => ({
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
              data={deliveryTimes?.map(item => ({
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

      <Card className="@xl/main:col-span-2">
        <CardHeader>
          <CardTitle>Распределение заказов по статусам и организациям</CardTitle>
          <CardDescription>
            Распределение заказов по статусам для каждой организации
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordersByStatusAndOrg?.map((org) => {
              const orgHiddenStatuses = hiddenStatuses[org.organizationId] || []
              const visibleStatuses = org.statuses.filter((s: any) => !orgHiddenStatuses.includes(s.statusName))
              
              return (
                <div key={org.organizationId} className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2 text-center">{org.organizationName}</h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={visibleStatuses}
                        cx="50%"
                        cy="40%"
                        innerRadius={40}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="statusName"
                      >
                        {visibleStatuses?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.statusColor || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value} заказов`, name]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        layout="vertical"
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        formatter={(value: any, entry: any) => {
                          const isHidden = orgHiddenStatuses.includes(value)
                          return (
                            <span style={{ 
                              textDecoration: isHidden ? 'line-through' : 'none',
                              opacity: isHidden ? 0.5 : 1
                            }}>
                              {value} ({entry.payload.count})
                            </span>
                          )
                        }}
                        onClick={(e: any) => {
                          if (e && e.value) {
                            handleLegendClick(org.organizationId, e.value)
                          }
                        }}
                        content={() => {
                          return (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {org.statuses.map((entry: any, index: number) => {
                                const isHidden = orgHiddenStatuses.includes(entry.statusName)
                                return (
                                  <li 
                                    key={`item-${index}`} 
                                    style={{ 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      marginBottom: 4,
                                      opacity: isHidden ? 0.5 : 1
                                    }}
                                    onClick={() => handleLegendClick(org.organizationId, entry.statusName)}
                                  >
                                    <span 
                                      style={{ 
                                        width: 10, 
                                        height: 10, 
                                        backgroundColor: entry.statusColor || COLORS[index % COLORS.length],
                                        display: 'inline-block',
                                        marginRight: 5,
                                        borderRadius: '50%'
                                      }} 
                                    />
                                    <span style={{ 
                                      textDecoration: isHidden ? 'line-through' : 'none',
                                      fontSize: 12
                                    }}>
                                      {entry.statusName} ({entry.count})
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    Всего: {org.statuses.reduce((sum: number, s: any) => sum + s.count, 0)} заказов
                  </div>
                </div>
              )
            })}
          </div>
          {!ordersByStatusAndOrg || ordersByStatusAndOrg.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Нет данных</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}