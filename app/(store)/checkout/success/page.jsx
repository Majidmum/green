import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatQty } from "@/lib/utils/format";

export const metadata = { title: "Заказ принят", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderSuccessPage({ searchParams }) {
  const id = String(searchParams?.order ?? "");
  if (!UUID.test(id)) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  // RLS: чужой заказ вернёт пустой результат
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,total,subtotal,promo_discount,delivery_fee,delivery_type,delivery_address,delivery_date,delivery_time_slot,order_items(id,product_name,unit,quantity,line_total)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tint text-brand">
          <CheckCircle2 size={34} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold text-heading">Заказ принят</h1>
        <p className="mt-2 text-body/70">
          Номер вашего заказа: <strong className="text-body">{order.order_number}</strong>
        </p>
        <p className="mt-1 text-sm text-body/60">Мы свяжемся с вами для подтверждения. Оплата — при получении.</p>
      </div>

      <div className="card mt-6 space-y-4 p-6 text-sm">
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-body/60">Получение</dt>
            <dd className="text-right font-medium">{order.delivery_type === "delivery" ? order.delivery_address : "Самовывоз"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-body/60">Дата и время</dt>
            <dd className="font-medium">{[order.delivery_date, order.delivery_time_slot].filter(Boolean).join(", ")}</dd>
          </div>
        </dl>
        <ul className="divide-y divide-heading/10 border-t border-heading/10">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-2">
              <span>{i.product_name} <span className="text-body/50">× {formatQty(i.quantity, i.unit)}</span></span>
              <span className="font-medium">{formatMoney(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-heading/10 pt-3">
          {Number(order.promo_discount) > 0 && (
            <div className="flex justify-between text-brand"><dt>Промокод</dt><dd>−{formatMoney(order.promo_discount)}</dd></div>
          )}
          {order.delivery_type === "delivery" && (
            <div className="flex justify-between"><dt className="text-body/60">Доставка</dt><dd>{Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee) : "бесплатно"}</dd></div>
          )}
          <div className="flex justify-between text-lg font-bold"><dt>Итого</dt><dd>{formatMoney(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/orders" className="btn-primary">Мои заказы</Link>
        <Link href="/catalog" className="btn-outline">Продолжить покупки</Link>
      </div>
    </div>
  );
}
