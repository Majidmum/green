import Link from "next/link";
import { escapeLike } from "@/lib/utils/catalog-params";
import { formatDate, formatMoney } from "@/lib/utils/format";
import StatusBadge from "@/components/ui/StatusBadge";

const PAGE_SIZE = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = ["pending", "confirmed", "assembling", "ready", "handed_to_courier", "on_the_way", "delivered", "cancelled"];

export function parseOrderParams(sp = {}) {
  return {
    status: STATUS.includes(sp.status) ? sp.status : "",
    q: String(sp.q ?? "").trim().slice(0, 80),
    from: DATE.test(sp.from ?? "") ? sp.from : "",
    to: DATE.test(sp.to ?? "") ? sp.to : "",
    type: ["delivery", "pickup"].includes(sp.type) ? sp.type : "",
    page: Math.max(parseInt(sp.page, 10) || 1, 1),
  };
}

async function fetchOrders(supabase, p) {
  let q = supabase
    .from("orders")
    .select("id,order_number,status,total,created_at,customer_name,customer_phone,delivery_type,payment_status,courier_name", { count: "exact" })
    .order("created_at", { ascending: false });
  if (p.status) q = q.eq("status", p.status);
  if (p.type) q = q.eq("delivery_type", p.type);
  if (p.from) q = q.gte("created_at", `${p.from}T00:00:00+05:00`);
  if (p.to) q = q.lt("created_at", new Date(new Date(`${p.to}T00:00:00+05:00`).getTime() + 86400000).toISOString());
  if (p.q) {
    const s = escapeLike(p.q).replace(/[,()]/g, " ");
    q = q.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
  }
  const from = (p.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);
  return { rows: data ?? [], count: count ?? 0 };
}

function View({ rows, base }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50">
          <tr>
            <th className="px-4 py-3">Заказ</th><th className="px-4 py-3">Клиент</th><th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Получение</th><th className="px-4 py-3 text-right">Сумма</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-heading/5">
          {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-body/50">Заказов не найдено</td></tr>}
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-tint/40">
              <td className="px-4 py-3"><Link href={`${base}/${o.id}`} className="font-semibold text-brand hover:underline">№ {o.order_number}</Link><p className="text-xs text-body/50">{formatDate(o.created_at)}</p></td>
              <td className="px-4 py-3">{o.customer_name}<p className="text-xs text-body/50">{o.customer_phone}</p></td>
              <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              <td className="px-4 py-3">{o.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}{o.courier_name && <p className="text-xs text-body/50">Курьер: {o.courier_name}</p>}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatMoney(o.total)}<p className="text-xs font-normal text-body/50">{o.payment_status === "paid" ? "оплачен" : o.payment_status === "refunded" ? "возврат" : "не оплачен"}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const OrdersTable = { fetch: fetchOrders, View, PAGE_SIZE };
