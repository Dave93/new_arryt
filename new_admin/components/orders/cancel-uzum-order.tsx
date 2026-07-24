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
import { Loader2, X } from "lucide-react";

interface CancelUzumOrderProps {
  orderId: string;
}

export function CancelUzumOrder({ orderId }: CancelUzumOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const orderEndpoint = apiClient.api.orders as any;
      const response = await orderEndpoint({ id: orderId }).cancel_uzum.post();

      if (response.data?.success) {
        toast.success("Uzum Tezkor доставка отменена");
      } else {
        toast.error(response.data?.message || "Не удалось отменить Uzum Tezkor доставку");
      }
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error cancelling Uzum order:", error);
      toast.error("Не удалось отменить Uzum Tezkor доставку");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4 mr-1" />
          Отменить Uzum
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md z-[1500]">
        <AlertDialogHeader>
          <AlertDialogTitle>Отмена Uzum Tezkor доставки</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите отменить Uzum Tezkor доставку для этого заказа?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отмена...
                </>
              ) : (
                "Отменить доставку"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
