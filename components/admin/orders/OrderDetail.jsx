import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import OrderActions from "@/components/admin/orders/OrderActions";
import ReturnForm from "@/components/admin/orders/ReturnForm";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Card({ title, children }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 font-display text-lg font-bold text-heading">{title}</h2>
      {children}
    </section>
  );
}
const Row = ({ k, children }) => (
  <div className="flex justify-between gap-4 py-1"><dt className="text-body/60">{k}</dt><dd className="text-right font-medium">{children}</dd></div>
);

// Страница заказа для персонала. canEdit=false — режим просмотра (руководитель).
export default async function OrderDetail({ supabase, id, base, canEdit }) {
  if (!UUID.test(id)) notFound();
  const { data: o, error } = await supabase
    .from("orders")
    .select("*,order_items(id,product_id,product_name,unit,quantity,unit_price,unit_cost,line_total),order_status_history(status,note,created_at,changed_by),order_returns(id,order_item_id,quantity,refund_amount,restocked,reason,created_at),delivery_zones(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!o) notFound();

  const actorIds = [...new Set(o.order_status_history.map((h) => h.changed_by).filter(Boolean))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name]));
  const history = [...o.order_status_history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const returnedBy = new Map();
  for (const r of o.order_returns) returnedBy.set(r.order_item_id, (returnedBy.get(r.order_item_id) ?? 0) + Number(r.quantity));
  const cost = o.order_items.reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
  const refunded = o.order_returns.reduce((s, r) => s + Number(r.refund_amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={base} className="inline-flex items-center gap-1 text-sm text-brand hover:underline"><ChevronLeft size={16} /> Все заказы</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-bold text-heading sm:text-3xl">Заказ № {o.order_number} <StatusBadge status={o.status} /></h1>
          <p className="text-sm text-body/60">Создан {formatDate(o.created_at)}{o.delivered_at && ` · доставлен ${formatDate(o.delivered_at)}`}</p>
        </div>
        <Link href={`${base}/${o.id}/print`} className="btn-outline !py-2.5"><Printer size={16} /> Накладная</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Состав заказа">
            <div className="overflow-x-auto">
              <table className="rt w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-body/50">
                  <tr><th className="py-2">Товар</th><th className="py-2">Кол-во</th><th className="py-2 text-right">Цена</th><th className="py-2 text-right">Себест.</th><th className="py-2 text-right">Сумма</th></tr>
                </thead>
                <tbody className="divide-y divide-heading/5">
                  {o.order_items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2">{i.product_name}{returnedBy.get(i.id) > 0 && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">возврат {formatQty(returnedBy.get(i.id), i.unit)}</span>}</td>
                      <td className="py-2">{formatQty(i.quantity, i.unit)}</td>
                      <td className="py-2 text-right">{formatMoney(i.unit_price)}</td>
                      <td className="py-2 text-right text-body/60">{formatMoney(i.unit_cost)}</td>
                      <td className="py-2 text-right font-semibold">{formatMoney(i.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-3 space-y-0.5 border-t border-heading/10 pt-3 text-sm">
              <Row k="Товары">{formatMoney(o.subtotal)}</Row>
              {Number(o.promo_discount) > 0 && <Row k="Промокод">−{formatMoney(o.promo_discount)}</Row>}
              {o.delivery_type === "delivery" && <Row k="Доставка">{formatMoney(o.delivery_fee)}</Row>}
              {refunded > 0 && <Row k="Возвраты">−{formatMoney(refunded)}</Row>}
              <Row k="Итого"><span className="text-lg font-bold">{formatMoney(o.total)}</span></Row>
              <Row k="Себестоимость товаров">{formatMoney(cost)}</Row>
            </dl>
          </Card>

          {canEdit && (
            <Card title="Управление заказом"><OrderActions order={{ id: o.id, status: o.status, delivery_type: o.delivery_type, courier_name: o.courier_name, courier_phone: o.courier_phone }} /></Card>
          )}

          {canEdit && o.status === "delivered" && (
            <Card title="Возврат товара">
              <ReturnForm orderId={o.id} items={o.order_items.map((i) => ({ id: i.id, product_name: i.product_name, unit: i.unit, quantity: Number(i.quantity), unit_price: Number(i.unit_price), returned: returnedBy.get(i.id) ?? 0 }))} />
            </Card>
          )}

          {o.order_returns.length > 0 && (
            <Card title="История возвратов">
              <ul className="divide-y divide-heading/5 text-sm">
                {o.order_returns.map((r) => (
                  <li key={r.id} className="flex justify-between gap-4 py-2">
                    <span>{formatDate(r.created_at)} · {r.restocked ? "возвращён на склад" : "списан как негодный"}{r.reason && ` · ${r.reason}`}</span>
                    <span className="font-semibold">−{formatMoney(r.refund_amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Клиент">
            <dl className="text-sm">
              <Row k="Имя">{o.customer_name}</Row>
              <Row k="Телефон"><a className="text-brand hover:underline" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></Row>
            </dl>
          </Card>
          <Card title="Получение">
            <dl className="text-sm">
              <Row k="Способ">{o.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}</Row>
              {o.delivery_zones?.name && <Row k="Район">{o.delivery_zones.name}</Row>}
              {o.delivery_address && <Row k="Адрес">{o.delivery_address}</Row>}
              {(o.delivery_date || o.delivery_time_slot) && <Row k="Когда">{[o.delivery_date, o.delivery_time_slot].filter(Boolean).join(", ")}</Row>}
              {o.courier_name && <Row k="Курьер">{o.courier_name}{o.courier_phone && `, ${o.courier_phone}`}</Row>}
              <Row k="Оплата">{o.payment_method === "cash_on_delivery" ? "Наличными при доставке" : "При самовывозе"} · {o.payment_status === "paid" ? "оплачен" : o.payment_status === "refunded" ? "возврат" : "не оплачен"}</Row>
              {o.comment && <Row k="Комментарий">{o.comment}</Row>}
              {o.cancel_reason && <Row k="Причина отмены">{o.cancel_reason}</Row>}
            </dl>
          </Card>
          <Card title="История статусов">
            <ol className="space-y-3 text-sm">
              {history.map((h, i) => (
                <li key={i} className="border-l-2 border-brand/30 pl-3">
                  <p className="font-semibold"><StatusBadge status={h.status} /></p>
                  <p className="text-xs text-body/60">{formatDate(h.created_at)}{h.changed_by && actorName.get(h.changed_by) ? ` · ${actorName.get(h.changed_by)}` : ""}</p>
                  {h.note && <p className="text-xs text-body/70">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
