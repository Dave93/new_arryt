"use client"

import { HeatMapView } from "@/components/orders/heat-map-view"
import { Card } from "@/components/ui/card"

export default function HeatMapPage() {
  return (
    <Card className="p-0 overflow-hidden h-[calc(100vh-6rem)]">
      <HeatMapView />
    </Card>
  )
} 