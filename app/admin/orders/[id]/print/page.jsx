import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/admin/PrintButton";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";

export const metadata = { title: "Накладная" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PrintOrder({ params }) {
  if (!UUID.test(params.id)) notFound();
  const supabase = createClient();
  const [{ data: o, error }, { data: info }] = await Promise.all([
    supabase.from("orders").select("*,order_items(id,product_name,unit,quantity,unit_price,line_total)").eq("id", params.id).maybeSingle(),
    supabase.from("store_settings").select("value").eq("key", "store_info").maybeSingle(),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!o) notFound();
  const store = info?.value ?? {};

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black print:p-0">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Накладная № {o.order_number}</h1>
          <p>от {formatDate(o.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{store.name ?? "Green Garden"}</p>
          {store.phone && <p>{store.phone}</p>}
          {store.address && <p>{store.address}</p>}
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div><p className="font-semibold">Получатель</p><p>{o.customer_name}</p><p>{o.customer_phone}</p></div>
        <div>
          <p className="font-semibold">{o.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}</p>
          {o.delivery_address && <p>{o.delivery_address}</p>}
          {(o.delivery_date || o.delivery_time_slot) && <p>{[o.delivery_date, o.delivery_time_slot].filter(Boolean).join(", ")}</p>}
          {o.comment && <p>Комментарий: {o.comment}</p>}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-y border-black text-left"><th className="py-2">№</th><th>Товар</th><th>Кол-во</th><th className="text-right">Цена</th><th className="text-right">Сумма</th></tr></thead>
        <tbody>
          {o.order_items.map((i, n) => (
            <tr key={i.id} className="border-b border-gray-300"><td className="py-1.5">{n + 1}</td><td>{i.product_name}</td><td>{formatQty(i.quantity, i.unit)}</td><td className="text-right">{formatMoney(i.unit_price)}</td><td className="text-right">{formatMoney(i.line_total)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 ml-auto w-64 space-y-1">
        <div className="flex justify-between"><span>Товары</span><span>{formatMoney(o.subtotal)}</span></div>
        {Number(o.promo_discount) > 0 && <div className="flex justify-between"><span>Промокод</span><span>−{formatMoney(o.promo_discount)}</span></div>}
        {o.delivery_type === "delivery" && <div className="flex justify-between"><span>Доставка</span><span>{formatMoney(o.delivery_fee)}</span></div>}
        <div className="flex justify-between border-t border-black pt-1 text-base font-bold"><span>К оплате</span><span>{formatMoney(o.total)}</span></div>
        <p className="text-xs">Оплата: {o.payment_method === "cash_on_delivery" ? "наличными при доставке" : "при самовывозе"}</p>
      </div>
      <div className="mt-8 flex gap-3"><PrintButton label="Распечатать" /></div>
    </div>
  );
}
