"use client";

import { useQueryStates, parseAsString } from "nuqs";
import { useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const parsers = {
  courierId: parseAsString.withDefault(""),
  courierLabel: parseAsString.withDefault(""),
};

export function CourierFilter() {
  const [{ courierId, courierLabel }, setCourier] = useQueryStates(parsers);

  const fetchCouriers = useCallback(
    async (search: string): Promise<Option[]> => {
      try {
        const response = await apiClient.api.couriers.search.get({
          query: { search },
        });
        const usersData = response.data || [];
        return usersData.map((user: User) => ({
          value: user.id,
          label: `${user.first_name} ${user.last_name}`,
        }));
      } catch {
        toast.error("Ошибка поиска курьеров");
        return [];
      }
    },
    [],
  );

  const selected = useMemo((): Option[] => {
    if (!courierId) return [];
    return [{ value: courierId, label: courierLabel || courierId }];
  }, [courierId, courierLabel]);

  return (
    <MultipleSelector
      value={selected}
      onChange={(opts) => {
        const opt = opts[0];
        setCourier({
          courierId: opt?.value ?? null,
          courierLabel: opt?.label ?? null,
        });
      }}
      onSearch={fetchCouriers}
      placeholder="Поиск курьера..."
      loadingIndicator={
        <div className="py-2 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
          Загрузка курьеров...
        </div>
      }
      emptyIndicator={
        <div className="py-2 text-center text-sm text-muted-foreground">
          Курьеры не найдены.
        </div>
      }
      maxSelected={1}
      hidePlaceholderWhenSelected
      className="w-auto"
      triggerSearchOnFocus
      delay={300}
      commandProps={{ label: "Поиск курьера" }}
      selectFirstItem={false}
    />
  );
}
