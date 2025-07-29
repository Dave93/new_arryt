import { Suspense } from "react"
import { DashboardStatsCards } from "@/components/dashboard/stats-cards"
import { OrderCharts } from "@/components/dashboard/order-charts"
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table"
import { TopLists } from "@/components/dashboard/top-lists"
import { DashboardDateRangeFilter } from "@/components/dashboard/date-range-filter"

export default function Page() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div>Загрузка...</div>}>
        <DashboardDateRangeFilter />
      </Suspense>
      <Suspense fallback={<div>Загрузка статистики...</div>}>
        <DashboardStatsCards />
      </Suspense>
      <Suspense fallback={<div>Загрузка графиков...</div>}>
        <OrderCharts />
      </Suspense>
      <Suspense fallback={<div>Загрузка топ списков...</div>}>
        <TopLists />
      </Suspense>
      <Suspense fallback={<div>Загрузка последних заказов...</div>}>
        <RecentOrdersTable />
      </Suspense>
    </div>
  )
}
