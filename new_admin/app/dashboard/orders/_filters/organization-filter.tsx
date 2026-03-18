"use client";

import { useQueryState, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/eden-client";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

interface Organization {
  id: string;
  name: string;
}

export function OrganizationFilter() {
  const [organization, setOrganization] = useQueryState(
    "organization",
    parseAsString.withDefault("all"),
  );

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["organizations-cached"],
    queryFn: async () => {
      const response = await apiClient.api.organizations.cached.get();
      return (response.data as Organization[]) || [];
    },
    staleTime: Infinity,
  });

  const options = useMemo((): Option[] => {
    const opts = organizations.map((org) => ({
      value: org.id,
      label: org.name,
    }));
    return [{ value: "all", label: "Все организации" }, ...opts];
  }, [organizations]);

  const selected = useMemo((): Option[] => {
    if (organization === "all") return [];
    const org = organizations.find((o) => o.id === organization);
    return org ? [{ value: org.id, label: org.name }] : [];
  }, [organization, organizations]);

  return (
    <MultipleSelector
      value={selected}
      onChange={(opts) => setOrganization(opts[0]?.value ?? "all")}
      options={options}
      placeholder="Выберите организацию"
      maxSelected={1}
      hidePlaceholderWhenSelected
      className="w-auto"
      commandProps={{ label: "Выберите организацию" }}
      selectFirstItem={false}
    />
  );
}
