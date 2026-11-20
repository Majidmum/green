import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/utils/catalog-params";
import { formatMoney, formatQty } from "@/lib/utils/format";
import SimplePagination from "@/components/ui/SimplePagination";

const PAGE_SIZE = 25;
const BADGE = {
  ok: ["В наличии", "bg-emerald-100 text-emerald-800"],
  low: ["Заканчивается", "bg-amber-100 text-amber-800"],
  zero: ["Нет в наличии", "bg-rose-100 text-rose-700"],
};

// Остатки склада (view stock_overview, RLS: только персонал). readOnly — для руководителя.
export default async function StockTable({ searchParams, basePath }) {
  const q = String(searchParams?.q ?? "").trim().slice(0, 80);
  const status = ["ok", "low", "zero"].includes(searchParams?.status) ? searchParams.status : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const supabase = createClient();

  let query = supabase.from("stock_overview").select("*", { count: "exact" }).order("name");
  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  if (status) query = query.eq("stock_status", status);
  const from = (page - 1) * PAGE_SIZE;

  const [{ data: rows, count, error }, { data: all, error: e2 }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("stock_overview").select("stock_status,stock_value"),
  ]);
  if ((error && error.code !== "PGRST103") || e2) throw new Error(`Supabase: ${(error || e2).message}`);

  const sum = { value: 0, low: 0, zero: 0, ok: 0 };
  for (const r of all ?? []) { sum.value += Number(r.stock_value); sum[r.stock_status] += 1; }

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Стоимость склада", formatMoney(sum.value), "по средней себестоимости"], ["В наличии", sum.ok, "позиций"], ["Заканчивается", sum.low, "ниже минимального остатка"], ["Нет в наличии", sum.zero, "позиций"]].map(([t, v, s]) => (
          <div key={t} className="card p-4"><p className="text-xs uppercase tracking-wide text-body/50">{t}</p><p className="mt-1 text-2xl font-bold text-heading">{v}</p><p className="text-xs text-body/50">{s}</p></div>
        ))}
      </div>
      <form method="get" className="card mb-4 flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[14rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body/40" /><input name="q" defaultValue={q} className="input !pl-9" placeholder="Название товара" aria-label="Поиск" /></div>
        <select name="status" defaultValue={status} className="input !w-auto" aria-label="Статус"><option value="">Все остатки</option><option value="ok">В наличии</option><option value="low">Заканчивается</option><option value="zero">Нет в наличии</option></select>
        <button className="btn-primary !py-2.5">Применить</button><Link href={basePath} className="btn-outline !py-2.5">Сбросить</Link>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50"><tr><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Категория</th><th className="px-4 py-3 text-right">Остаток</th><th className="px-4 py-3 text-right">Мин.</th><th className="px-4 py-3 text-right">Себест.</th><th className="px-4 py-3 text-right">Стоимость</th><th className="px-4 py-3">Статус</th></tr></thead>
          <tbody className="divide-y divide-heading/5">
            {!rows?.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-body/50">Ничего не найдено</td></tr>}
            {(rows ?? []).map((r) => (
              <tr key={r.product_id}>
                <td className="px-4 py-2.5 font-medium">{r.name}{!r.is_active && <span className="ml-2 text-xs text-body/40">скрыт</span>}</td>
                <td className="px-4 py-2.5 text-body/60">{r.category_name}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatQty(r.quantity, r.unit)}</td>
                <td className="px-4 py-2.5 text-right text-body/60">{formatQty(r.min_stock, r.unit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(r.avg_cost)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(r.stock_value)}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[r.stock_status][1]}`}>{BADGE[r.stock_status][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath={basePath} query={{ q, status }} />
    </>
  );
}
