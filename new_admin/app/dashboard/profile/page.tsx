"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { IconShield, IconPhone, IconUser, IconEdit, IconMail } from "@tabler/icons-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Пользователь не найден</p>
          <Button asChild>
            <Link href="/auth/login">Войти в систему</Link>
          </Button>
        </div>
      </div>
    )
  }

  const displayName = user.name || "Не указано"
    
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Профиль пользователя</h1>
        <Button asChild>
          <Link href="/dashboard/profile/edit">
            <IconEdit className="h-4 w-4 mr-2" />
            Редактировать
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              Основная информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{displayName}</h2>
                </div>
                <p className="text-muted-foreground">ID: {user.id}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Имя</label>
                <p className="text-sm">{user.name || "Не указано"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2">
                  <IconMail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{user.email || "Не указано"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Информация об аккаунте</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID пользователя</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                {user.id}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email адрес</label>
              <p className="text-sm mt-1">{user.email || "Не указан"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 