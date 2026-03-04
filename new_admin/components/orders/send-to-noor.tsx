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

interface SendOrderToNoorProps {
  order: Order;
}

export function SendOrderToNoor({ order }: SendOrderToNoorProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendToNoor = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.missed_orders.send_noor.post({
        id: order.id,
      });

      toast.success("Заказ отправлен в Noor");
    } catch (error) {
      console.error("Error sending order to Noor:", error);
      toast.error("Не удалось отправить заказ в Noor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSendToNoor}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconSend className="h-4 w-4 mr-2" />
      )}
      Отправить в Noor
    </Button>
  );
}
