"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/eden-client";
import { toast } from "sonner";
import { useSelectedOrdersStore } from "@/lib/selected-orders-store";

interface ChangeStatusPopoverProps {
  organizationId: string;
}

export function ChangeStatusPopover({ organizationId }: ChangeStatusPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { selectedOrderIds, clearSelection } = useSelectedOrdersStore();
  const queryClient = useQueryClient();

  // Fetch order statuses for the selected organization
  const { data: orderStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ["orderStatuses", organizationId],
    queryFn: async () => {
      try {
        const response = await apiClient.api.order_status.cached.get({
          query: {}
        });
        // Filter statuses by organization
        const statuses = response.data || [];
        return statuses.filter((status: any) =>
          !status.organization_id || status.organization_id === organizationId
        );
      } catch (error) {
        toast.error("Ошибка загрузки статусов");
        return [];
      }
    },
    enabled: open && !!organizationId,
  });

  // Mutation for batch status update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, statusId }: { orderIds: string[], statusId: string }) => {
      const response = await apiClient.api.orders.batch.status.patch({
        order_ids: orderIds,
        status_id: statusId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Статус обновлен для ${data.updated_count} заказов`);
      // Invalidate orders query to refetch data
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      clearSelection();
      setOpen(false);
      setSelectedStatus("");
    },
    onError: (error) => {
      toast.error("Ошибка при обновлении статуса", {
        description: error.message,
      });
    },
  });

  const handleApply = () => {
    if (!selectedStatus) {
      toast.error("Выберите статус");
      return;
    }

    const orderIds = Array.from(selectedOrderIds);
    updateStatusMutation.mutate({ orderIds, statusId: selectedStatus });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Изменить статус
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Изменить статус</h4>
            <p className="text-sm text-muted-foreground">
              Выбрано заказов: {selectedOrderIds.size}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Новый статус</label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={isLoadingStatuses}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingStatuses ? "Загрузка..." : "Выберите статус"} />
              </SelectTrigger>
              <SelectContent>
                {orderStatuses.map((status: any) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={!selectedStatus || updateStatusMutation.isPending}
              className="flex-1"
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Применить
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Отмена
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
