"use client"

import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { Plus } from "lucide-react"
import usePermissions from "@/hooks/use-permissions"
import { useMemo } from "react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon,
    actionLink?: string
    permission?: string
  }[]
}) {
  const pathname = usePathname()
  const permissions = usePermissions()

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.permission) {
        return permissions?.includes(item.permission)
      }
      return true
    })
  }, [JSON.stringify(items), JSON.stringify(permissions)])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                asChild
                isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.actionLink && (
                <SidebarMenuAction asChild>
                  <Link href={item.actionLink}>
                    <Plus />
                  </Link>
                </SidebarMenuAction>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
