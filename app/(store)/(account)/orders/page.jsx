import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import SimplePagination from "@/components/ui/SimplePagination";
import { formatDate, formatMoney, plural } from "@/lib/utils/format";

export const metadata = { title: "Мои заказы", robots: { index: false } };

const PAGE_SIZE = 10;
const TABS = [
  { key: "", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "delivered", label: "Доставленные" },
  { key: "cancelled", label: "Отменённые" },
];

export default async function OrdersPage({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const tab = TABS.some((t) => t.key === searchParams?.status) ? searchParams.status : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);

  let q = supabase
    .from("orders")
    .select("id,order_number,status,total,created_at,delivery_type,order_items(id)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (tab === "active") q = q.not("status", "in", "(delivered,cancelled)");
  else if (tab) q = q.eq("status", tab);

  const from = (page - 1) * PAGE_SIZE;
  const { data: orders, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  // Страница за пределами диапазона — это не ошибка, а пустой список
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  return (
    <div>
      <h1 className="mb-6 font-display text-4xl font-bold text-heading">Мои заказы</h1>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key ? `/orders?status=${t.key}` : "/orders"} aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t.key ? "bg-brand text-white" : "bg-surface shadow-soft hover:bg-tint"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Package size={40} className="text-brand/50" />
          <p className="text-body/70">{tab ? "Заказов с таким статусом нет" : "Вы ещё ничего не заказывали"}</p>
          <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 transition hover:shadow-lift">
                <div>
                  <p className="font-semibold">№ {o.order_number}</p>
                  <p className="text-sm text-body/60">
                    {formatDate(o.created_at)} · {o.order_items.length} {plural(o.order_items.length, ["позиция", "позиции", "позиций"])} · {o.delivery_type === "delivery" ? "доставка" : "самовывоз"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="text-lg font-bold">{formatMoney(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/orders" query={{ status: tab }} />
    </div>
  );
}
