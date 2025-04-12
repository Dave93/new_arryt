"use client";

import { useSearchParams } from "next/navigation";
import OrderStatusEdit from "../edit";

export default function OrderStatusEditWrapper() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  return <OrderStatusEdit params={{ id }} />;
} 