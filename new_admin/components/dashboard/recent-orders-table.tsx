"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export function RecentOrdersTable() { 

  const { data: orders, isLoading } = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: async () => {
      const response = await apiClient.api.dashboard["recent-orders"].get({
        query: { limit: 10 }
      })
      if (response.error) throw response.error
      return response.data
    },
    refetchInterval: 30000
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPhoneNumber = (phone: string) => {
    // Форматирование телефонного номера
    const cleaned = phone.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/)
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]}-${match[4]}-${match[5]}`
    }
    return phone
  }

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Последние заказы</CardTitle>
        <CardDescription>
          Последние 10 заказов в системе
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер заказа</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Курьер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Адрес доставки</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Время</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.customerPhone ? formatPhoneNumber(order.customerPhone) : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.courierFirstName ? (
                        `${order.courierFirstName} ${order.courierLastName || ''}`
                      ) : (
                        <span className="text-muted-foreground">Не назначен</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        style={{
                          borderColor: order.statusColor || undefined,
                          color: order.statusColor || undefined
                        }}
                      >
                        {order.statusName}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={order.deliveryAddress}>
                      {order.deliveryAddress}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-medium">
                          {formatCurrency(order.orderPrice)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Доставка: {formatCurrency(order.deliveryPrice)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(order.createdAt), {
                        addSuffix: true,
                        locale: ru
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Нет данных
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}