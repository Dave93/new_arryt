"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { sortBy } from "lodash";
import { apiClient } from "@/lib/eden-client";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

interface Terminal {
  id: string;
  name: string;
}

export function TerminalsFilter() {
  const [terminals, setTerminals] = useQueryState(
    "terminals",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const { data: allTerminals = [] } = useQuery<Terminal[]>({
    queryKey: ["terminals-cached"],
    queryFn: async () => {
      const response = await apiClient.api.terminals.cached.get();
      return sortBy((response.data as Terminal[]) || [], "name");
    },
    staleTime: Infinity,
  });

  const options = useMemo(
    (): Option[] =>
      allTerminals.map((t) => ({ value: t.id, label: t.name })),
    [allTerminals],
  );

  const selected = useMemo(
    (): Option[] =>
      terminals
        .map((id) => allTerminals.find((t) => t.id === id))
        .filter((t): t is Terminal => !!t)
        .map((t) => ({ value: t.id, label: t.name })),
    [terminals, allTerminals],
  );

  return (
    <MultipleSelector
      value={selected}
      onChange={(opts) => {
        const ids = opts.map((o) => o.value);
        setTerminals(ids.length > 0 ? ids : null);
      }}
      options={options}
      placeholder="Выберите терминалы..."
      className="w-auto"
      emptyIndicator={
        <div className="py-2 text-center text-sm text-muted-foreground">
          Терминалы не найдены.
        </div>
      }
      commandProps={{ label: "Выберите терминалы" }}
      selectFirstItem={false}
    />
  );
}
