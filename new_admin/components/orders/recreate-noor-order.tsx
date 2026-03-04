"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface RecreateNoorOrderProps {
  orderId: string;
  hasNoorId: boolean;
}

export function RecreateNoorOrder({ orderId, hasNoorId }: RecreateNoorOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleRecreate = async () => {
    setIsLoading(true);
    try {
      const orderEndpoint = apiClient.api.orders as any;
      const response = await orderEndpoint({id: orderId}).recreate_noor.post();

      if (response.data?.success) {
        toast.success(hasNoorId
          ? "Заказ пересоздан в Noor Доставке"
          : "Заказ отправлен в Noor Доставку"
        );
      } else {
        toast.error(response.data?.message || "Не удалось пересоздать заказ");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error recreating Noor order:", error);
      toast.error("Не удалось пересоздать заказ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          {hasNoorId ? "Пересоздать Noor" : "Отправить Noor"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md z-[1500]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasNoorId ? "Пересоздать заказ в Noor Доставке" : "Отправить в Noor Доставку"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasNoorId
              ? "Текущая доставка будет отменена и создана заново. Продолжить?"
              : "Заказ будет отправлен в Noor Доставку. Продолжить?"
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleRecreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : hasNoorId ? (
                "Пересоздать"
              ) : (
                "Отправить"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
