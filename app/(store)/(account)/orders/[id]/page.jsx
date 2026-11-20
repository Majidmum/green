import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import OrderTracker from "@/components/orders/OrderTracker";
import CancelOrderButton from "@/components/orders/CancelOrderButton";
import RepeatOrderButton from "@/components/orders/RepeatOrderButton";
import ReviewItem from "@/components/orders/ReviewItem";
import { formatDate, formatMoney, formatQty } from "@/lib/utils/format";

export const metadata = { title: "Заказ", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }) {
  if (!UUID.test(params.id)) notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${params.id}`);

  // RLS отдаёт только заказы текущего пользователя
  const { data: o, error } = await supabase
    .from("orders")
    .select("*,order_items(id,product_id,product_name,unit,quantity,unit_price,line_total),order_status_history(status,created_at,note)")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!o) notFound();

  const [{ data: returns }, { data: reviews }] = await Promise.all([
    supabase.from("order_returns").select("order_item_id,quantity,refund_amount").eq("order_id", o.id),
    supabase.from("product_reviews").select("id,product_id,rating,body,photo_url,status").eq("user_id", user.id),
  ]);
  const reviewByProduct = new Map((reviews ?? []).map((r) => [r.product_id, r]));
  const history = [...o.order_status_history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const canCancel = ["pending", "confirmed"].includes(o.status);
  const delivered = o.status === "delivered";
  const returned = (returns ?? []).reduce((s, r) => s + Number(r.refund_amount), 0);

  return (
    <div className="space-y-6">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-brand hover:underline"><ChevronLeft size={16} /> Все заказы</Link>
      <h1 className="font-display text-3xl font-bold text-heading">Заказ № {o.order_number}</h1>

      <section className="card p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-heading">Статус</h2>
        <OrderTracker
          orderId={o.id}
          deliveryType={o.delivery_type}
          initial={{ status: o.status, courier_name: o.courier_name, courier_phone: o.courier_phone, history }}
        />
        {canCancel && <div className="mt-6"><CancelOrderButton orderId={o.id} /></div>}
        {["assembling", "ready"].includes(o.status) && (
          <p className="mt-4 text-xs text-body/60">Заказ уже собирается — отмена недоступна. Свяжитесь с магазином, если нужно изменить заказ.</p>
        )}
      </section>

      <section className="card p-6 text-sm">
        <h2 className="mb-4 font-display text-xl font-bold text-heading">Состав заказа</h2>
        <ul className="divide-y divide-heading/10">
          {o.order_items.map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex justify-between gap-4">
                <span>
                  {i.product_id ? <Link href={`/catalog?q=${encodeURIComponent(i.product_name)}`} className="font-medium hover:text-brand">{i.product_name}</Link> : <span className="font-medium">{i.product_name}</span>}
                  <span className="text-body/50"> × {formatQty(i.quantity, i.unit)} по {formatMoney(i.unit_price)}</span>
                </span>
                <span className="font-semibold">{formatMoney(i.line_total)}</span>
              </div>
              {delivered && i.product_id && (
                <div className="mt-2"><ReviewItem productId={i.product_id} existing={reviewByProduct.get(i.product_id)} /></div>
              )}
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-heading/10 pt-3">
          <div className="flex justify-between"><dt className="text-body/60">Товары</dt><dd>{formatMoney(o.subtotal)}</dd></div>
          {Number(o.promo_discount) > 0 && <div className="flex justify-between text-brand"><dt>Промокод</dt><dd>−{formatMoney(o.promo_discount)}</dd></div>}
          {o.delivery_type === "delivery" && <div className="flex justify-between"><dt className="text-body/60">Доставка</dt><dd>{Number(o.delivery_fee) > 0 ? formatMoney(o.delivery_fee) : "бесплатно"}</dd></div>}
          {returned > 0 && <div className="flex justify-between text-rose-600"><dt>Возврат</dt><dd>−{formatMoney(returned)}</dd></div>}
          <div className="flex justify-between text-lg font-bold"><dt>Итого</dt><dd>{formatMoney(o.total)}</dd></div>
        </dl>
      </section>

      <section className="card p-6 text-sm">
        <h2 className="mb-4 font-display text-xl font-bold text-heading">Получение</h2>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4"><dt className="text-body/60">Способ</dt><dd className="text-right font-medium">{o.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}</dd></div>
          {o.delivery_address && <div className="flex justify-between gap-4"><dt className="text-body/60">Адрес</dt><dd className="text-right font-medium">{o.delivery_address}</dd></div>}
          {(o.delivery_date || o.delivery_time_slot) && <div className="flex justify-between gap-4"><dt className="text-body/60">Дата и время</dt><dd className="font-medium">{[o.delivery_date, o.delivery_time_slot].filter(Boolean).join(", ")}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-body/60">Получатель</dt><dd className="text-right font-medium">{o.customer_name}, {o.customer_phone}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-body/60">Оплата</dt><dd className="font-medium">{o.payment_method === "cash_on_delivery" ? "Наличными при доставке" : "При самовывозе"} · {o.payment_status === "paid" ? "оплачен" : o.payment_status === "refunded" ? "возвращён" : "не оплачен"}</dd></div>
          {o.comment && <div className="flex justify-between gap-4"><dt className="text-body/60">Комментарий</dt><dd className="text-right">{o.comment}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-body/60">Создан</dt><dd>{formatDate(o.created_at)}</dd></div>
        </dl>
      </section>

      <RepeatOrderButton items={o.order_items.filter((i) => i.product_id).map((i) => ({ product_id: i.product_id, quantity: i.quantity }))} />
    </div>
  );
}
