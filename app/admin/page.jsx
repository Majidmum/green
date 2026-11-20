import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { presetRange } from "@/lib/analytics/period";
import { getReport, num } from "@/lib/analytics/report";
import { formatMoney, formatDate } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/analytics/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";

export const metadata = { title: "Дашборд" };

export default async function AdminDashboard() {
  const supabase = createClient();
  const [today, week] = [presetRange("today"), presetRange("7d")];
  const [td, wk, recent, stock, pending] = await Promise.all([
    getReport(supabase, { from: today[0], to: today[1] }),
    getReport(supabase, { from: week[0], to: week[1] }),
    supabase.from("orders").select("id,order_number,status,total,created_at,customer_name").order("created_at", { ascending: false }).limit(8),
    supabase.from("stock_overview").select("product_id,name,unit,quantity,min_stock,stock_status").in("stock_status", ["zero", "low"]).eq("is_active", true).order("quantity").limit(8),
    supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const k = td.kpis, w = wk.kpis;
  return (
    <>
      <PageHeader title="Дашборд" description="Оперативная сводка: сегодня и последние 7 дней." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Заказов сегодня" value={num(k.orders_created)} hint={`в работе: ${num(k.orders_active)}`} />
        <KpiCard title="Выручка сегодня" value={formatMoney(k.revenue)} hint="доставленные заказы" />
        <KpiCard title="Выручка за 7 дней" value={formatMoney(w.revenue)} hint={`заказов доставлено: ${num(w.orders_delivered)}`} />
        <KpiCard title="Новые отзывы" value={pending.count ?? 0} hint="ждут модерации" tone={pending.count ? "bad" : undefined} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-heading">Последние заказы</h2><Link href="/admin/orders" className="text-sm text-brand hover:underline">Все заказы</Link></div>
          {recent.data?.length ? (
            <ul className="divide-y divide-body/10">
              {recent.data.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand hover:underline">№ {o.order_number}</Link><p className="text-xs text-body/50">{o.customer_name} · {formatDate(o.created_at)}</p></div>
                  <div className="text-right"><StatusBadge status={o.status} /><p className="mt-1 font-semibold">{formatMoney(o.total)}</p></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-body/60">Заказов пока нет.</p>}
        </section>
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-heading">Заканчивается на складе</h2><Link href="/admin/stock" className="text-sm text-brand hover:underline">Остатки</Link></div>
          {stock.data?.length ? (
            <ul className="divide-y divide-body/10">
              {stock.data.map((p) => (
                <li key={p.product_id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className={p.stock_status === "zero" ? "font-semibold text-rose-600" : "font-semibold text-amber-600"}>{num(p.quantity)} {p.unit === "kg" ? "кг" : "шт"}{p.stock_status === "zero" ? " · нет" : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-body/60">Все позиции в достаточном количестве.</p>}
        </section>
      </div>
    </>
  );
}
