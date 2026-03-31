"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/eden-client"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface DeliverySourceRow {
  date: string
  yandex_count: number
  noor_count: number
  own_count: number
  total: number
}

export function DeliverySources() {
  const [open, setOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const searchParams = useSearchParams()
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const region = searchParams.get("region")
  const organizationId = searchParams.get("organization_id")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-delivery-sources", startDate, endDate, region, organizationId],
    queryFn: async () => {
      const response = await apiClient.api.dashboard["delivery-sources"].get({
        query: {
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate }),
          ...(region && { region }),
          ...(organizationId && { organization_id: organizationId }),
        },
      })
      return response.data as DeliverySourceRow[]
    },
  })

  const totals = (data || []).reduce(
    (acc, row) => ({
      yandex: acc.yandex + Number(row.yandex_count),
      noor: acc.noor + Number(row.noor_count),
      own: acc.own + Number(row.own_count),
      total: acc.total + Number(row.total),
    }),
    { yandex: 0, noor: 0, own: 0, total: 0 }
  )

  const pct = (value: number, total: number) =>
    total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%"

  const days = (data || []).length
  const avg = (value: number) => days > 0 ? Math.round(value / days) : 0
  const avgPct = (value: number, total: number) =>
    days > 0 ? pct(value / days, total / days) : "0%"

  return (
    <>
    {fullscreen && <div className="fixed inset-0 bg-background z-50 overflow-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Доставка по типам курьеров</h2>
        <Button variant="outline" size="sm" onClick={() => setFullscreen(false)}>
          <Minimize2 className="h-4 w-4 mr-1" /> Свернуть
        </Button>
      </div>
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">По количеству заказов</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {data && data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-1.5 text-sm">Дата</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Своя</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Yandex</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Noor</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Всего</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="py-1.5 text-sm">{format(new Date(row.date), "dd MMM", { locale: ru })}</TableCell>
                      <TableCell className="py-1.5 text-sm text-center">{Number(row.own_count)}</TableCell>
                      <TableCell className="py-1.5 text-sm text-center">{Number(row.yandex_count)}</TableCell>
                      <TableCell className="py-1.5 text-sm text-center">{Number(row.noor_count)}</TableCell>
                      <TableCell className="py-1.5 text-sm text-center font-semibold">{Number(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="py-1.5 text-sm font-bold">Итого</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{totals.own}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{totals.yandex}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{totals.noor}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{totals.total}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1.5 text-sm font-bold">Среднее</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avg(totals.own)}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avg(totals.yandex)}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avg(totals.noor)}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avg(totals.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">По процентам</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {data && data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-1.5 text-sm">Дата</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Своя</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Yandex</TableHead>
                    <TableHead className="py-1.5 text-sm text-center">Noor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const total = Number(row.total)
                    return (
                      <TableRow key={row.date}>
                        <TableCell className="py-1.5 text-sm">{format(new Date(row.date), "dd MMM", { locale: ru })}</TableCell>
                        <TableCell className="py-1.5 text-sm text-center">{pct(Number(row.own_count), total)}</TableCell>
                        <TableCell className="py-1.5 text-sm text-center">{pct(Number(row.yandex_count), total)}</TableCell>
                        <TableCell className="py-1.5 text-sm text-center">{pct(Number(row.noor_count), total)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="py-1.5 text-sm font-bold">Среднее</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avgPct(totals.own, totals.total)}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avgPct(totals.yandex, totals.total)}</TableCell>
                    <TableCell className="py-1.5 text-sm text-center font-bold">{avgPct(totals.noor, totals.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>}
    <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold cursor-pointer" onClick={() => setOpen(!open)}>Доставка по типам курьеров — по количеству заказов</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFullscreen(true)}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(!open)}>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {open && (
          <CardContent className="px-4 pb-3 pt-0">
            {isLoading ? (
              <div className="text-muted-foreground text-sm py-4 text-center">Загрузка...</div>
            ) : !data || data.length === 0 ? (
              <div className="text-muted-foreground text-sm py-4 text-center">Нет данных</div>
            ) : (
              <>
                <div className="relative max-h-[300px] overflow-auto">
                  <table className="w-full table-fixed caption-bottom text-sm">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 z-10 border-b">
                      <tr>
                        <th className="py-1.5 px-3 text-sm text-left text-muted-foreground font-medium w-[20%]">Дата</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[20%]">Своя</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[20%]">Yandex</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[20%]">Noor</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[20%]">Всего</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.date} className="border-b">
                          <td className="py-1.5 px-3 text-sm w-[20%]">{format(new Date(row.date), "dd MMM", { locale: ru })}</td>
                          <td className="py-1.5 px-3 text-sm text-center w-[20%]">{Number(row.own_count)}</td>
                          <td className="py-1.5 px-3 text-sm text-center w-[20%]">{Number(row.yandex_count)}</td>
                          <td className="py-1.5 px-3 text-sm text-center w-[20%]">{Number(row.noor_count)}</td>
                          <td className="py-1.5 px-3 text-sm text-center w-[20%] font-semibold">{Number(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-zinc-100 dark:bg-zinc-900 border-t font-medium">
                      <tr className="border-b">
                        <td className="py-1.5 px-3 text-sm font-bold w-[20%]">Итого</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{totals.own}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{totals.yandex}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{totals.noor}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{totals.total}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-sm font-bold w-[20%]">Среднее</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{avg(totals.own)}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{avg(totals.yandex)}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{avg(totals.noor)}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[20%]">{avg(totals.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold cursor-pointer" onClick={() => setOpen(!open)}>Доставка по типам курьеров — по процентам</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFullscreen(true)}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(!open)}>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {open && (
          <CardContent className="px-4 pb-3 pt-0">
            {isLoading ? (
              <div className="text-muted-foreground text-sm py-4 text-center">Загрузка...</div>
            ) : !data || data.length === 0 ? (
              <div className="text-muted-foreground text-sm py-4 text-center">Нет данных</div>
            ) : (
              <>
                <div className="relative max-h-[300px] overflow-auto">
                  <table className="w-full table-fixed caption-bottom text-sm">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 z-10 border-b">
                      <tr>
                        <th className="py-1.5 px-3 text-sm text-left text-muted-foreground font-medium w-[25%]">Дата</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[25%]">Своя</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[25%]">Yandex</th>
                        <th className="py-1.5 px-3 text-sm text-center text-muted-foreground font-medium w-[25%]">Noor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        const total = Number(row.total)
                        return (
                          <tr key={row.date} className="border-b">
                            <td className="py-1.5 px-3 text-sm w-[25%]">{format(new Date(row.date), "dd MMM", { locale: ru })}</td>
                            <td className="py-1.5 px-3 text-sm text-center w-[25%]">{pct(Number(row.own_count), total)}</td>
                            <td className="py-1.5 px-3 text-sm text-center w-[25%]">{pct(Number(row.yandex_count), total)}</td>
                            <td className="py-1.5 px-3 text-sm text-center w-[25%]">{pct(Number(row.noor_count), total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-zinc-100 dark:bg-zinc-900 border-t font-medium">
                      <tr>
                        <td className="py-1.5 px-3 text-sm font-bold w-[25%]">Среднее</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[25%]">{avgPct(totals.own, totals.total)}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[25%]">{avgPct(totals.yandex, totals.total)}</td>
                        <td className="py-1.5 px-3 text-sm text-center font-bold w-[25%]">{avgPct(totals.noor, totals.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
    </>
  )
}
