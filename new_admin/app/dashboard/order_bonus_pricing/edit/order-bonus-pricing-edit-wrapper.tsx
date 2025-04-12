"use client";

import { useSearchParams } from "next/navigation";
import OrderBonusPricingEdit from "../edit";

export default function OrderBonusPricingEditWrapper() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return <OrderBonusPricingEdit id={id || ""} />;
} 