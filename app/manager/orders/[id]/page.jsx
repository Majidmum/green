import { createClient } from "@/lib/supabase/server";
import OrderDetail from "@/components/admin/orders/OrderDetail";

export const metadata = { title: "Заказ" };

export default function ManagerOrderPage({ params }) {
  return <OrderDetail supabase={createClient()} id={params.id} base="/manager/orders" canEdit={false} />;
}
