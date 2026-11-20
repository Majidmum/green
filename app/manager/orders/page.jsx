import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import SimplePagination from "@/components/ui/SimplePagination";
import OrdersFilters from "@/components/admin/orders/OrdersFilters";
import { OrdersTable, parseOrderParams } from "@/components/admin/orders/OrdersTable";

export const metadata = { title: "Заказы" };

export default async function ManagerOrdersPage({ searchParams }) {
  const p = parseOrderParams(searchParams);
  const { rows, count } = await OrdersTable.fetch(createClient(), p);
  return (
    <>
      <PageHeader title="Заказы" description="Режим просмотра: статусы и возвраты меняет администратор." />
      <OrdersFilters params={p} basePath="/manager/orders" />
      <OrdersTable.View rows={rows} base="/manager/orders" />
      <SimplePagination page={p.page} total={count} pageSize={OrdersTable.PAGE_SIZE} basePath="/manager/orders" query={{ status: p.status, q: p.q, from: p.from, to: p.to, type: p.type }} />
    </>
  );
}
