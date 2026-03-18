import { Suspense } from "react";
import { OrdersContent } from "./_orders-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-[80vh] w-full rounded-lg" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
