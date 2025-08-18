"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconFileDescription,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconUsers,
  IconShield,
  IconTruckDelivery,
  IconAlertTriangle,
  IconMap,
  IconFlame,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  navMain: [
    {
      title: "Панель управления",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Заказы",
      url: "/dashboard/orders",
      icon: IconShoppingCart,
      permission: "orders.list",
    },
    {
      title: "Заказы на карте",
      url: "/dashboard/orders/map",
      icon: IconMap,
      permission: "orders.list",
    },
    {
      title: "Тепловая карта",
      url: "/dashboard/heat-map",
      icon: IconFlame,
      permission: "orders.list",
    },
    {
      title: "Фин. гарант",
      url: "/dashboard/orders/orders_garant_report",
      icon: IconChartBar,
      permission: "orders.list",
    },
    {
      title: "Гарант",
      url: "/dashboard/orders/yuriy_orders_garant_report",
      icon: IconChartBar,
      permission: "orders.list",
    },
    {
      title: "Пропущенные заказы",
      url: "/dashboard/missed_orders",
      icon: IconAlertTriangle,
      permission: "orders.list",
    },
    {
      title: "Статусы заказов",
      url: "/dashboard/order_status",
      icon: IconListDetails,
      actionLink: "/dashboard/order_status/create",
      permission: "order_status.edit",
    },
    {
      title: "Разрешения",
      url: "/dashboard/permissions",
      icon: IconFileDescription,
      actionLink: "/dashboard/permissions/create",
      permission: "permissions.edit",
    },
    {
      title: "Роли",
      url: "/dashboard/roles",
      icon: IconShield,
      actionLink: "/dashboard/roles/create",
      permission: "roles.edit",
    },
    {
      title: "Организации",
      url: "/dashboard/organization",
      icon: IconFolder,
      actionLink: "/dashboard/organization/create",
      permission: "organization.edit",
    },
    {
      title: "Терминалы",
      url: "/dashboard/terminals",
      icon: IconListDetails,
      actionLink: "/dashboard/terminals/create",
      permission: "terminals.edit",
    },
    {
      title: "Тарификация доставки",
      url: "/dashboard/delivery_pricing",
      icon: IconTruckDelivery,
      actionLink: "/dashboard/delivery_pricing/create",
      permission: "delivery_pricing.edit",
    },
    {
      title: "Дневные гарантии",
      url: "/dashboard/daily_garant",
      icon: IconListDetails,
      actionLink: "/dashboard/daily_garant/create",
      permission: "daily_garant.edit",
    },
    {
      title: "Бонусы за заказы",
      url: "/dashboard/order_bonus_pricing",
      icon: IconListDetails,
      actionLink: "/dashboard/order_bonus_pricing/create",
      permission: "order_bonus_pricing.edit",
    },
    {
      title: "Построенные бонусы",
      url: "/dashboard/constructed_bonus_pricing",
      icon: IconListDetails,
      actionLink: "/dashboard/constructed_bonus_pricing/create",
      permission: "constructed_bonus_pricing.edit",
    },
    {
      title: "Графики работы",
      url: "/dashboard/work_schedules",
      icon: IconListDetails,
      actionLink: "/dashboard/work_schedules/create",
      permission: "work_schedules.edit",
    },
    {
      title: "Эффективность курьеров",
      url: "/dashboard/courier_efficiency",
      icon: IconChartBar,
      permission: "courier_efficiency.list",
    },
    {
      title: "Выплаты курьерам",
      url: "/dashboard/manager_withdraw",
      icon: IconTruckDelivery,
      permission: "manager_withdraw.list",
    },
    {
      title: "Кошелёк курьеров",
      url: "/dashboard/courier_balance",
      icon: IconListDetails,
      permission: "manager_withdraw.edit",
    },
    {
      title: "Перекличка курьеров",
      url: "/dashboard/roll_call",
      icon: IconUsers,
      permission: "terminals.list",
    },
    {
      title: "Пользователи",
      url: "/dashboard/users",
      icon: IconUsers,
      actionLink: "/dashboard/users/create/",
      permission: "users.edit",
    },
    {
      title: "Клиенты",
      url: "/dashboard/customers",
      icon: IconUsers,
      permission: "customers.edit",
    },
    {
      title: "Настройки",
      url: "/dashboard/settings",
      icon: IconSettings,
      permission: "settings.edit",
    },
  ],
  navSecondary: [
    {
      title: "Помощь",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Поиск",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: []
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <span className="text-xl font-bold uppercase">Arryt</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
