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

interface RemoveOrderCourierProps {
  orderId: string;
}

export function RemoveOrderCourier({ orderId }: RemoveOrderCourierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleRemoveCourier = async () => {
    setIsLoading(true);
    try {
      // Use type assertion for dynamic property access
      const orderEndpoint = apiClient.api.orders as any;
      await orderEndpoint({id: orderId}).revoke.post();
      
      toast.success("Курьер успешно снят с заказа");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error removing courier:", error);
      toast.error("Не удалось снять курьера с заказа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4" />
          <span className="sr-only">Remove courier</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md z-[1000]">
        <AlertDialogHeader>
          <AlertDialogTitle>Снятие курьера</AlertDialogTitle>
          <AlertDialogDescription>
            Вы действительно хотите снять курьера с заказа?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              variant="destructive" 
              onClick={handleRemoveCourier}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Снять курьера"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 