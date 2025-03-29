"use client";

import React from "react";
import OriginalOrderDetailsClientPage from "@/app/dashboard/orders/[id]/page.client";

interface OrderDetailsWrapperProps {
  orderId: string;
  isSheet?: boolean;
}

export function OrderDetailsClientPage({ orderId, isSheet = true }: OrderDetailsWrapperProps) {
  return (
    <div className={isSheet ? "pb-10" : "container mx-auto py-10"}>
      <OriginalOrderDetailsClientPage orderId={orderId} />
    </div>
  );
} 