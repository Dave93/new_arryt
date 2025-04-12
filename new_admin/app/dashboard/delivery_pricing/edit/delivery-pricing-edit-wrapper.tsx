"use client";

import { useSearchParams } from "next/navigation";
import DeliveryPricingEdit from "../edit";

export default function DeliveryPricingEditWrapper() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return <DeliveryPricingEdit id={id || ""} />;
} 