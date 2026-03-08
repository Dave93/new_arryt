"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/eden-client";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

interface OrderStatus {
  id: string;
  name: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
}

export function StatusesFilter() {
  const [statuses, setStatuses] = useQueryState(
    "statuses",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const { data: allStatuses = [] } = useQuery<OrderStatus[]>({
    queryKey: ["orderStatuses-cached"],
    queryFn: async () => {
      const response = await apiClient.api.order_status.cached.get({
        query: {},
      });
      const data = response.data || [];
      return (data as OrderStatus[]).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },
    staleTime: Infinity,
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["organizations-cached"],
    queryFn: async () => {
      const response = await apiClient.api.organizations.cached.get();
      return (response.data as Organization[]) || [];
    },
    staleTime: Infinity,
  });

  const options = useMemo((): Option[] => {
    return allStatuses.map((status) => {
      const org = organizations.find((o) => o.id === status.organization_id);
      return {
        value: status.id,
        label: status.name,
        group: org?.name || "",
      };
    });
  }, [allStatuses, organizations]);

  const selected = useMemo((): Option[] => {
    return statuses
      .map((id) => allStatuses.find((s) => s.id === id))
      .filter((s): s is OrderStatus => !!s)
      .map((status) => {
        const org = organizations.find(
          (o) => o.id === status.organization_id,
        );
        return {
          value: status.id,
          label: status.name,
          group: org?.name || "",
        };
      });
  }, [statuses, allStatuses, organizations]);

  return (
    <MultipleSelector
      value={selected}
      onChange={(opts) => {
        const ids = opts.map((o) => o.value);
        setStatuses(ids.length > 0 ? ids : null);
      }}
      options={options}
      groupBy="group"
      placeholder="Выберите статусы..."
      className="w-auto"
      emptyIndicator={
        <div className="py-2 text-center text-sm text-muted-foreground">
          Статусы не найдены.
        </div>
      }
      commandProps={{ label: "Выберите статусы" }}
      selectFirstItem={false}
    />
  );
}
