"use client"

import { OrdersMapView } from "@/components/orders/orders-map-view"
import { Card } from "@/components/ui/card"

export default function OrdersMapPage() {
  return (
    <Card className="p-0 overflow-hidden h-[calc(100vh-6rem)]">
      <OrdersMapView />
    </Card>
  )
} 