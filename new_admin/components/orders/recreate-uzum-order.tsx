"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";

interface RecreateUzumOrderProps {
  orderId: string;
  hasUzumId: boolean;
}

const TAXI_CLASSES = [
  { value: "courier", label: "Курьер" },
  { value: "express", label: "Экспресс" },
];

export function RecreateUzumOrder({ orderId, hasUzumId }: RecreateUzumOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("courier");
  const queryClient = useQueryClient();

  const handleRecreate = async () => {
    if (!selectedClass) {
      toast.error("Выберите тип доставки");
      return;
    }

    setIsLoading(true);
    try {
      const orderEndpoint = apiClient.api.orders as any;
      const response = await orderEndpoint({ id: orderId }).recreate_uzum.post({
        taxi_class: selectedClass,
      });

      if (response.data?.success) {
        toast.success(hasUzumId
          ? "Заказ пересоздан в Uzum Tezkor"
          : "Заказ отправлен в Uzum Tezkor"
        );
      } else {
        toast.error(response.data?.message || "Не удалось пересоздать заказ");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error recreating Uzum order:", error);
      toast.error("Не удалось пересоздать заказ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        setSelectedClass("courier");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          {hasUzumId ? "Пересоздать Uzum" : "Отправить Uzum-ом"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md z-[1400]">
        <DialogHeader>
          <DialogTitle>
            {hasUzumId ? "Пересоздать заказ в Uzum Tezkor" : "Отправить в Uzum Tezkor"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Тип доставки</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип доставки" />
              </SelectTrigger>
              <SelectContent className="z-[1500]">
                {TAXI_CLASSES.map((tc) => (
                  <SelectItem key={tc.value} value={tc.value}>
                    {tc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleRecreate}
              disabled={isLoading || !selectedClass}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : hasUzumId ? (
                "Пересоздать"
              ) : (
                "Отправить"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
