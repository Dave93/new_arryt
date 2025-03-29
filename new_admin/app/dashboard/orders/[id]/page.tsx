import { OrderDetailsClientPage } from "@/components/orders/order-details-client-page";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return <OrderDetailsClientPage orderId={params.id} isSheet={false} />;
} 