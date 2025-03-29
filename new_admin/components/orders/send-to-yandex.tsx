"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient, useGetAuthHeaders } from "@/lib/eden-client";
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
  const authHeaders = useGetAuthHeaders();

  const handleSendToYandex = async () => {
    setIsLoading(true);
    try {
      await apiClient.api.missed_orders.send_yandex.post({
        id: order.id,
      }, {
        // @ts-ignore
        headers: authHeaders,
      });
      
      toast.success("Order sent to Yandex successfully");
    } catch (error) {
      console.error("Error sending order to Yandex:", error);
      toast.error("Failed to send order to Yandex");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSendToYandex}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconSend className="h-4 w-4 mr-2" />
      )}
      Send to Yandex
    </Button>
  );
} 