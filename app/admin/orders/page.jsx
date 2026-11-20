import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES } from "@/lib/constants";
import { escapeLike } from "@/lib/utils/catalog-params";
import { formatDate, formatMoney } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import SimplePagination from "@/components/ui/SimplePagination";
import OrdersFilters from "@/components/admin/orders/OrdersFilters";
import { OrdersTable, parseOrderParams } from "@/components/admin/orders/OrdersTable";

export const metadata = { title: "Заказы" };

export default async function AdminOrdersPage({ searchParams }) {
  const p = parseOrderParams(searchParams);
  const supabase = createClient();
  const { rows, count } = await OrdersTable.fetch(supabase, p);
  return (
    <>
      <PageHeader title="Заказы" description="Новые заказы приходят со статусом «Заказ принят». Статус можно менять только вперёд; отмена возвращает товар на склад." />
      <OrdersFilters params={p} basePath="/admin/orders" />
      <OrdersTable.View rows={rows} base="/admin/orders" />
      <SimplePagination page={p.page} total={count} pageSize={OrdersTable.PAGE_SIZE} basePath="/admin/orders" query={{ status: p.status, q: p.q, from: p.from, to: p.to, type: p.type }} />
    </>
  );
}
