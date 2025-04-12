"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { IconEdit } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";

// Define types matching the API response
interface CourierData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  drive_type: "bycicle" | "foot" | "bike" | "car" | null;
}

interface ChangeOrderCourierProps {
  orderId: string;
  terminalId: string;
}

export function ChangeOrderCourier({ orderId, terminalId }: ChangeOrderCourierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>();
  const queryClient = useQueryClient();

  // Fetch couriers data when the dialog is opened
  const { data: couriers = [], isLoading: isCouriersLoading, refetch } = useQuery({
    queryKey: ["couriers", terminalId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.api.couriers.for_terminal.get({
          query: {
            terminal_id: terminalId,
          },
        });
        
        return Array.isArray(data) ? data as CourierData[] : [];
      } catch (error) {
        toast.error("Failed to load couriers");
        return [];
      }
    },
    enabled: isOpen, // Only fetch when dialog is open
  });

  const handleChangeCourier = async () => {
    if (!selectedCourier) {
      toast.error("Please select a courier");
      return;
    }

    setIsLoading(true);
    try {
      // Use type assertion for dynamic property access
      const orderEndpoint = apiClient.api.orders as any;
      await orderEndpoint[orderId].assign.post({
        courier_id: selectedCourier,
      });
      
      toast.success("Courier changed successfully");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } catch (error) {
      console.error("Error changing courier:", error);
      toast.error("Failed to change courier");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        // Reset selected courier and trigger refetch when opening
        setSelectedCourier(undefined);
        refetch();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <IconEdit className="h-4 w-4" />
          <span className="sr-only">Change courier</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md z-[1000]">
        <DialogHeader>
          <DialogTitle>Change Courier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select
            disabled={isCouriersLoading}
            value={selectedCourier}
            onValueChange={setSelectedCourier}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select courier" />
            </SelectTrigger>
            <SelectContent className="z-[1000]">
              {couriers.map((courier) => (
                <SelectItem key={courier.id} value={courier.id}>
                  {`${courier.first_name || ''} ${courier.last_name || ''}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeCourier}
              disabled={isLoading || !selectedCourier}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Courier"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 