import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { INVENTORY_TX_TYPES, TX_REASONS } from "@/lib/constants";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";
import SimplePagination from "@/components/ui/SimplePagination";

const PAGE_SIZE = 30;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Журнал движений склада (только чтение). Используется в админке и у руководителя.
export default async function StockJournal({ searchParams, basePath }) {
  const type = Object.keys(INVENTORY_TX_TYPES).includes(searchParams?.type) ? searchParams.type : "";
  const product = UUID.test(searchParams?.product ?? "") ? searchParams.product : "";
  const from = DATE.test(searchParams?.from ?? "") ? searchParams.from : "";
  const to = DATE.test(searchParams?.to ?? "") ? searchParams.to : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const supabase = createClient();

  let q = supabase
    .from("inventory_transactions")
    .select("id,type,quantity_change,quantity_before,quantity_after,unit_cost,document_number,reason,comment,occurred_at,created_by,order_id,products(name,unit),suppliers(name)", { count: "exact" })
    .order("occurred_at", { ascending: false }).order("created_at", { ascending: false });
  if (type) q = q.eq("type", type);
  if (product) q = q.eq("product_id", product);
  if (from) q = q.gte("occurred_at", `${from}T00:00:00+05:00`);
  if (to) q = q.lt("occurred_at", new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86400000).toISOString());
  const start = (page - 1) * PAGE_SIZE;

  const [{ data: rows, count, error }, { data: prods }] = await Promise.all([
    q.range(start, start + PAGE_SIZE - 1),
    supabase.from("products").select("id,name").order("name"),
  ]);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  const ids = [...new Set((rows ?? []).map((r) => r.created_by).filter(Boolean))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="product" defaultValue={product} className="input lg:col-span-2" aria-label="Товар"><option value="">Все товары</option>{(prods ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="type" defaultValue={type} className="input" aria-label="Тип"><option value="">Все операции</option>{Object.entries(INVENTORY_TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="date" name="from" defaultValue={from} className="input" aria-label="С даты" />
        <input type="date" name="to" defaultValue={to} className="input" aria-label="По дату" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className="btn-primary !py-2.5">Применить</button><Link href={basePath} className="btn-outline !py-2.5">Сбросить</Link></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-brand-dark/10 text-xs uppercase tracking-wide text-brand-ink/50">
            <tr><th className="px-4 py-3">Дата</th><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Операция</th><th className="px-4 py-3 text-right">Изменение</th><th className="px-4 py-3 text-right">Остаток</th><th className="px-4 py-3 text-right">Себест.</th><th className="px-4 py-3">Детали</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-dark/5">
            {!rows?.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-ink/50">Движений не найдено</td></tr>}
            {(rows ?? []).map((r) => {
              const ch = Number(r.quantity_change);
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-brand-ink/70">{formatDate(r.occurred_at)}</td>
                  <td className="px-4 py-2.5 font-medium">{r.products?.name}</td>
                  <td className="px-4 py-2.5">{INVENTORY_TX_TYPES[r.type]}{r.reason && <span className="text-brand-ink/50"> · {TX_REASONS[r.reason] ?? r.reason}</span>}</td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold ${ch < 0 ? "text-rose-600" : "text-emerald-600"}`}>{ch > 0 ? "+" : ""}{formatQty(ch, r.products?.unit)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-brand-ink/70">{Number(r.quantity_before)} → {Number(r.quantity_after)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(r.unit_cost)}</td>
                  <td className="px-4 py-2.5 text-xs text-brand-ink/60">
                    {[r.document_number && `док. ${r.document_number}`, r.suppliers?.name, r.comment, r.created_by && who.get(r.created_by)].filter(Boolean).join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath={basePath} query={{ type, product, from, to }} />
    </>
  );
}
