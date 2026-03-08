"use client";

import { useQueryStates } from "nuqs";
import { ordersFiltersParsers } from "./parsers";

export function useOrderFilters() {
  return useQueryStates(ordersFiltersParsers);
}
