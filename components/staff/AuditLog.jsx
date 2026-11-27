import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import SimplePagination from "@/components/ui/SimplePagination";

const PAGE_SIZE = 30;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TABLES = {
  products: "Товары", profiles: "Пользователи", promo_codes: "Промокоды", promotions: "Акции", store_settings: "Настройки",
  expenses: "Расходы", delivery_zones: "Зоны доставки", categories: "Категории", banners: "Баннеры", suppliers: "Поставщики", inventory: "Закупочные цены",
};
const ACTIONS = { INSERT: "Создание", UPDATE: "Изменение", DELETE: "Удаление", COST_CHANGE: "Смена закупочной цены" };
const HIDE = new Set(["updated_at", "created_at"]);

function changes(a) {
  if (a.action === "INSERT") return "Создана запись";
  if (a.action === "DELETE") return "Запись удалена";
  const o = a.old_data ?? {}, n = a.new_data ?? {};
  const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])].filter((k) => !HIDE.has(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  const short = (v) => { const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "—"); return s.length > 40 ? s.slice(0, 40) + "…" : s; };
  return keys.slice(0, 5).map((k) => `${k}: ${short(o[k])} → ${short(n[k])}`).join("; ") || "—";
}

// Журнал действий (audit_logs): только чтение, виден администратору и руководителю.
export default async function AuditLog({ searchParams, basePath }) {
  const table = Object.keys(TABLES).includes(searchParams?.table) ? searchParams.table : "";
  const action = Object.keys(ACTIONS).includes(searchParams?.action) ? searchParams.action : "";
  const from = DATE.test(searchParams?.from ?? "") ? searchParams.from : "";
  const to = DATE.test(searchParams?.to ?? "") ? searchParams.to : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const supabase = createClient();

  let q = supabase.from("audit_logs").select("id,table_name,record_id,action,old_data,new_data,actor_id,created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (table) q = q.eq("table_name", table);
  if (action) q = q.eq("action", action);
  if (from) q = q.gte("created_at", `${from}T00:00:00+05:00`);
  if (to) q = q.lt("created_at", new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86400000).toISOString());
  const start = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(start, start + PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  const ids = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="table" defaultValue={table} className="input" aria-label="Раздел"><option value="">Все разделы</option>{Object.entries(TABLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="action" defaultValue={action} className="input" aria-label="Действие"><option value="">Все действия</option>{Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="date" name="from" defaultValue={from} className="input" aria-label="С даты" />
        <input type="date" name="to" defaultValue={to} className="input" aria-label="По дату" />
        <div className="flex flex-wrap gap-2"><button className="btn-primary !py-2.5">Применить</button><Link href={basePath} className="btn-outline !py-2.5">Сбросить</Link></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="rt w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50"><tr><th className="px-4 py-3">Когда</th><th className="px-4 py-3">Кто</th><th className="px-4 py-3">Раздел</th><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Что изменилось</th></tr></thead>
          <tbody className="divide-y divide-heading/5">
            {!data?.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-body/50">Записей нет</td></tr>}
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-body/70">{formatDate(a.created_at)}</td>
                <td className="px-4 py-2.5">{a.actor_id ? who.get(a.actor_id) || "Сотрудник" : <span className="text-body/40">система</span>}</td>
                <td className="px-4 py-2.5">{TABLES[a.table_name] ?? a.table_name}</td>
                <td className="px-4 py-2.5">{ACTIONS[a.action] ?? a.action}</td>
                <td className="max-w-md break-words px-4 py-2.5 text-xs text-body/70">{changes(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath={basePath} query={{ table, action, from, to }} />
    </>
  );
}
