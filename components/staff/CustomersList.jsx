import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils/format";
import SimplePagination from "@/components/ui/SimplePagination";

const PAGE_SIZE = 20;

// Клиенты со статистикой заказов (RPC admin_customers, доступна персоналу). ordersHref — ссылка на заказы клиента.
export default async function CustomersList({ searchParams, basePath, ordersBase }) {
  const q = String(searchParams?.q ?? "").trim().slice(0, 80);
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const { data, error } = await createClient().rpc("admin_customers", { p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const total = Number(data?.[0]?.total_count ?? 0);

  return (
    <>
      <form method="get" className="card mb-4 flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[14rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" /><input name="q" defaultValue={q} className="input !pl-9" placeholder="Имя, телефон или email" aria-label="Поиск клиента" /></div>
        <button className="btn-primary !py-2.5">Найти</button><Link href={basePath} className="btn-outline !py-2.5">Сбросить</Link>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-brand-dark/10 text-xs uppercase tracking-wide text-brand-ink/50"><tr><th className="px-4 py-3">Клиент</th><th className="px-4 py-3">Контакты</th><th className="px-4 py-3 text-right">Заказов</th><th className="px-4 py-3 text-right">Выкуплено на</th><th className="px-4 py-3">Последний заказ</th><th className="px-4 py-3">Регистрация</th></tr></thead>
          <tbody className="divide-y divide-brand-dark/5">
            {!data?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-ink/50">Клиентов не найдено</td></tr>}
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.full_name || "—"}{!c.is_active && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">заблокирован</span>}</td>
                <td className="px-4 py-3 text-brand-ink/70">{c.phone}<p className="text-xs">{c.email}</p></td>
                <td className="px-4 py-3 text-right">{ordersBase && c.phone ? <Link className="text-brand hover:underline" href={`${ordersBase}?q=${encodeURIComponent(c.phone.replace(/\D/g, "").slice(-9))}`}>{Number(c.orders_count)}</Link> : Number(c.orders_count)}<p className="text-xs text-brand-ink/50">доставлено: {Number(c.delivered_count)}</p></td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(c.total_spent)}</td>
                <td className="px-4 py-3 text-brand-ink/70">{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
                <td className="px-4 py-3 text-brand-ink/70">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={total} pageSize={PAGE_SIZE} basePath={basePath} query={{ q }} />
    </>
  );
}
