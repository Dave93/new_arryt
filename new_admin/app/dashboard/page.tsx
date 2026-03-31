import { Suspense } from "react"
import { DashboardStatsCards } from "@/components/dashboard/stats-cards"
import { OrderCharts } from "@/components/dashboard/order-charts"
import { TopLists } from "@/components/dashboard/top-lists"
import { DashboardDateRangeFilter } from "@/components/dashboard/date-range-filter"
import { DeliverySources } from "@/components/dashboard/delivery-sources"

export default function Page() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div>Загрузка...</div>}>
        <DashboardDateRangeFilter />
      </Suspense>
      <Suspense fallback={<div>Загрузка статистики...</div>}>
        <DashboardStatsCards />
      </Suspense>
      <Suspense fallback={<div>Загрузка...</div>}>
        <DeliverySources />
      </Suspense>
      <Suspense fallback={<div>Загрузка графиков...</div>}>
        <OrderCharts />
      </Suspense>
      <Suspense fallback={<div>Загрузка топ списков...</div>}>
        <TopLists />
      </Suspense>
    </div>
  )
}
