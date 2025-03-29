import { OrderDetailsClientPage } from "@/components/orders/order-details-client-page";

// Define page props according to Next.js 15 requirements
type Params = Promise<{ id: string }>;

// This is now a Server Component
export default async function OrderDetailPage({ 
  params 
}: { 
  params: Params 
}) {
  // Await the params promise to get the id
  const { id } = await params;
  
  return <OrderDetailsClientPage orderId={id} isSheet={false} />;
} 