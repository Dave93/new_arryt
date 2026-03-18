"use client"

import { type Icon } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
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
  icon?: Icon
  defaultOpen?: boolean
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
    <SidebarGroup>
      <SidebarMenu>
        {filteredGroups.map((group, groupIndex) => {
          const hasActiveItem = group.items.some(
            (item) => pathname === item.url || pathname.startsWith(`${item.url}/`)
          )

          return (
            <Collapsible
              key={group.label ?? groupIndex}
              asChild
              defaultOpen={hasActiveItem || group.defaultOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem className="mt-4 first:mt-0">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={group.label}>
                    {group.icon && <group.icon />}
                    <span>{group.label}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu className="pl-4 pt-1">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                          isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                        >
                          <Link href={item.url}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
