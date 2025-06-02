"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconBell, IconCheck, IconTrash, IconSettings } from "@tabler/icons-react"

// Пример данных уведомлений
const notifications = [
  {
    id: "1",
    title: "Новый заказ",
    message: "Поступил новый заказ #12345",
    type: "info",
    read: false,
    timestamp: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    title: "Системное обновление",
    message: "Система будет обновлена сегодня в 23:00",
    type: "warning",
    read: true,
    timestamp: "2024-01-15T09:15:00Z",
  },
  {
    id: "3",
    title: "Новый пользователь",
    message: "Зарегистрирован новый пользователь",
    type: "success",
    read: false,
    timestamp: "2024-01-15T08:45:00Z",
  },
]

export default function NotificationsPage() {
  const unreadCount = notifications.filter(n => !n.read).length

  const getVariantByType = (type: string) => {
    switch (type) {
      case "success":
        return "default"
      case "warning":
        return "secondary"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Уведомления</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} новых
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <IconCheck className="h-4 w-4 mr-2" />
            Отметить все как прочитанные
          </Button>
          <Button variant="outline" size="sm">
            <IconSettings className="h-4 w-4 mr-2" />
            Настройки
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconBell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет уведомлений</h3>
              <p className="text-muted-foreground text-center">
                У вас пока нет уведомлений. Они появятся здесь, когда будут доступны.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-colors ${!notification.read ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <Badge variant={getVariantByType(notification.type)} className="text-xs">
                      {notification.type === "info" && "Информация"}
                      {notification.type === "warning" && "Предупреждение"}
                      {notification.type === "success" && "Успех"}
                      {notification.type === "error" && "Ошибка"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <IconCheck className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(notification.timestamp)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 