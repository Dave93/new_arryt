"use client";

import { useQueryState, parseAsString } from "nuqs";
import { useMemo } from "react";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

const regionOptions: Option[] = [
  { value: "all", label: "Все регионы" },
  { value: "capital", label: "Столица" },
  { value: "region", label: "Регион" },
];

export function RegionFilter() {
  const [region, setRegion] = useQueryState(
    "region",
    parseAsString.withDefault("capital"),
  );

  const selected = useMemo((): Option[] => {
    if (region === "all") return [];
    const opt = regionOptions.find((r) => r.value === region);
    return opt ? [opt] : [];
  }, [region]);

  return (
    <MultipleSelector
      value={selected}
      onChange={(opts) => setRegion(opts[0]?.value ?? "all")}
      defaultOptions={regionOptions}
      placeholder="Выберите регион"
      maxSelected={1}
      hidePlaceholderWhenSelected
      className="w-auto"
      commandProps={{ label: "Выберите регион" }}
      selectFirstItem={false}
    />
  );
}
