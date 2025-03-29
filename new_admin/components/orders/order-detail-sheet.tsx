"use client";

import { ReactNode, useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { OrderDetailsClientPage } from "@/components/orders/order-details-client-page";
import Link from "next/link";

interface OrderDetailSheetProps {
  orderId: string;
  openInNewPage?: boolean;
  children?: ReactNode;
}

export function OrderDetailSheet({ orderId, openInNewPage = false, children }: OrderDetailSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children ? (
          children
        ) : openInNewPage ? (
          <Button asChild size="sm" variant="default">
            <Link href={`/dashboard/orders/${orderId}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="default">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-[95%] sm:min-w-[90%] md:min-w-[80%] lg:min-w-[75%] xl:min-w-[70%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Информация о заказе</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <OrderDetailsClientPage orderId={orderId} isSheet={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
} 