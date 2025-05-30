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

interface SendOrderToYandexProps {
  order: Order;
}

export function SendOrderToYandex({ order }: SendOrderToYandexProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendToYandex = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.missed_orders.send_yandex.post({
        id: order.id,
      });
      
      toast.success("Заказ отправлен в Яндекс");
    } catch (error) {
      console.error("Error sending order to Yandex:", error);
      toast.error("Не удалось отправить заказ в Яндекс");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={handleSendToYandex}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconSend className="h-4 w-4 mr-2" />
      )}
      Отправить в Яндекс
    </Button>
  );
} 