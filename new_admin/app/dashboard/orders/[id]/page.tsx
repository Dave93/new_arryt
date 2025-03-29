import OrderDetailsClientPage from "./page.client";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

// This is now a Server Component
export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  // We pass the id extracted from params on the server to the client component
  return <OrderDetailsClientPage orderId={id} />;
} 