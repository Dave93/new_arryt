"use client"

import { type Icon } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { Plus } from "lucide-react"
import usePermissions from "@/hooks/use-permissions"
import { useMemo } from "react"

type NavItem = {
  title: string
  url: string
  icon?: Icon
  actionLink?: string
  permission?: string
}

export type NavGroup = {
  label?: string
  items: NavItem[]
}

export function NavMain({
  groups,
}: {
  groups: NavGroup[]
}) {
  const pathname = usePathname()
  const permissions = usePermissions()

  const filteredGroups = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.permission) {
          return permissions?.includes(item.permission)
        }
        return true
      }),
    })).filter((group) => group.items.length > 0)
  }, [JSON.stringify(groups), JSON.stringify(permissions)])

  return (
    <>
      {filteredGroups.map((group, groupIndex) => (
        <SidebarGroup key={group.label ?? groupIndex}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => (
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
      ))}
    </>
  )
}
