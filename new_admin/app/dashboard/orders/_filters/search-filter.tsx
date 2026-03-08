"use client";

import { useQueryState, parseAsString } from "nuqs";
import { Input } from "@/components/ui/input";

export function SearchFilter() {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 500 }),
  );

  return (
    <Input
      placeholder="Поиск заказов..."
      value={search}
      onChange={(e) => setSearch(e.target.value || null)}
      className="w-auto"
    />
  );
}
