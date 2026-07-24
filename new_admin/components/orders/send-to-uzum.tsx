"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/eden-client";
import { IconSend } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";

interface Order {
  id: string;
  [key: string]: any;
}

interface SendOrderToUzumProps {
  order: Order;
}

export function SendOrderToUzum({ order }: SendOrderToUzumProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendToUzum = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.missed_orders.send_uzum.post({
        id: order.id,
      });

      toast.success("Заказ отправлен в Uzum Tezkor");
    } catch (error) {
      console.error("Error sending order to Uzum:", error);
      toast.error("Не удалось отправить заказ в Uzum Tezkor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSendToUzum}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconSend className="h-4 w-4 mr-2" />
      )}
      Отправить в Uzum
    </Button>
  );
}
