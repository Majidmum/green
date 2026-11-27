"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CreditCard, ShoppingBasket } from "lucide-react";
import { cartSubtotal, useCart } from "@/store/cart";
import { useCartSync } from "@/hooks/useCartSync";
import { usePromo } from "@/hooks/usePromo";
import { checkoutFormSchema } from "@/lib/validations/checkout";
import { calcTotals } from "@/lib/utils/pricing";
import { formatMoney, formatQty } from "@/lib/utils/format";
import { placeOrder } from "@/app/(store)/checkout/actions";
import FormField from "@/components/auth/FormField";
import PromoBox from "@/components/cart/PromoBox";
import SyncNotes from "@/components/cart/SyncNotes";

const KEY = "gg-checkout-key";

// Ключ идемпотентности живёт, пока заказ не оформлен: повторный клик или перезагрузка
// страницы во время отправки не создадут второй заказ.
function getIdempotencyKey() {
  try {
    let k = sessionStorage.getItem(KEY);
    if (!k) {
      k = crypto.randomUUID();
      sessionStorage.setItem(KEY, k);
    }
    return k;
  } catch {
    return crypto.randomUUID();
  }
}

const card = "card p-4 sm:p-6";
const radioCard =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-heading/15 bg-surface p-4 transition has-[:checked]:border-brand has-[:checked]:bg-tint/50";

function addressLine(a) {
  return [a.street, a.house && `д. ${a.house}`, a.apartment && `кв. ${a.apartment}`].filter(Boolean).join(", ");
}

export default function CheckoutForm({ user, addresses, zones, slots, today }) {
  const router = useRouter();
  const { hydrated, status, notes, refresh } = useCartSync();
  const items = useCart((s) => s.items);
  const subtotal = useCart(cartSubtotal);
  const clear = useCart((s) => s.clear);
  const promo = usePromo(subtotal, true);
  const keyRef = useRef(null);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      delivery_type: "delivery",
      delivery_zone_id: zones.length === 1 ? zones[0].id : "",
      address_mode: addresses.length ? "saved" : "new",
      address_id: addresses[0]?.id ?? "",
      street: "", house: "", apartment: "", entrance: "", floor: "", address_note: "",
      save_address: true,
      delivery_date: today,
      delivery_time_slot: slots[0] ?? "",
      comment: "",
      customer_name: user.name ?? "",
      customer_phone: user.phone ?? "",
    },
  });

  useEffect(() => {
    keyRef.current = getIdempotencyKey();
  }, []);

  const deliveryType = watch("delivery_type");
  const addressMode = watch("address_mode");
  const zoneId = watch("delivery_zone_id");
  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const delivery = deliveryType === "delivery";
  const totals = calcTotals({
    subtotal,
    promoDiscount: promo.status === "ok" ? promo.discount : 0,
    zone,
    deliveryType,
  });
  const usable = items.filter((i) => !i.outOfStock);
  const hasSoldOut = items.length > usable.length;

  async function onSubmit(values) {
    setServerError("");
    if (promo.status === "error") {
      setServerError("Исправьте или уберите промокод, чтобы продолжить");
      return;
    }
    const res = await placeOrder({
      ...values,
      items: usable.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      promo_code: promo.status === "ok" ? promo.code : "",
      idempotency_key: keyRef.current || getIdempotencyKey(),
    });

    if (!res.ok) {
      if (res.needLogin) {
        router.push("/login?next=/checkout");
        return;
      }
      setServerError(res.error);
      for (const [field, message] of Object.entries(res.fields ?? {})) setError(field, { message });
      refresh(); // подтянуть актуальные остатки и цены
      return;
    }
    try { sessionStorage.removeItem(KEY); } catch {}
    clear();
    router.replace(`/checkout/success?order=${res.orderId}`);
  }

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl2 bg-surface/60" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-brand"><ShoppingBasket size={30} /></span>
        <h2 className="text-xl font-semibold">В корзине пусто</h2>
        <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
      </div>
    );
  }

  const blocked = isSubmitting || hasSoldOut || usable.length === 0 || promo.status === "loading" || (delivery && totals.belowMin);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-6">
        <SyncNotes notes={notes} />
        {status === "error" && (
          <p className="rounded-xl2 bg-amber-50 px-5 py-4 text-sm text-amber-900" role="status">
            Не удалось обновить цены и наличие. Итоговую сумму подтвердит сервер при оформлении.
          </p>
        )}

        <section className={card} aria-labelledby="h-type">
          <h2 id="h-type" className="mb-4 text-lg font-semibold">Способ получения</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={radioCard}>
              <input type="radio" value="delivery" className="mt-1 accent-brand" {...register("delivery_type")} />
              <span><span className="block font-semibold">Доставка</span><span className="text-sm text-body/60">Курьер привезёт заказ по адресу</span></span>
            </label>
            <label className={radioCard}>
              <input type="radio" value="pickup" className="mt-1 accent-brand" {...register("delivery_type")} />
              <span><span className="block font-semibold">Самовывоз</span><span className="text-sm text-body/60">Заберёте заказ сами</span></span>
            </label>
          </div>
        </section>

        {delivery && (
          <section className={`${card} space-y-4`} aria-labelledby="h-addr">
            <h2 id="h-addr" className="text-lg font-semibold">Адрес доставки</h2>

            <FormField id="delivery_zone_id" label="Район" error={errors.delivery_zone_id?.message}>
              <select id="delivery_zone_id" className="input" {...register("delivery_zone_id")}>
                <option value="">Выберите район</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {Number(z.delivery_fee) > 0 ? formatMoney(z.delivery_fee) : "бесплатно"}
                  </option>
                ))}
              </select>
            </FormField>
            {zone && (
              <p className="text-sm text-body/60">
                {zone.free_delivery_from ? `Бесплатно от ${formatMoney(zone.free_delivery_from)}. ` : ""}
                {Number(zone.min_order_total) > 0 ? `Минимальный заказ: ${formatMoney(zone.min_order_total)}.` : ""}
              </p>
            )}

            {addresses.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={radioCard}>
                  <input type="radio" value="saved" className="mt-1 accent-brand" {...register("address_mode")} />
                  <span className="font-medium">Сохранённый адрес</span>
                </label>
                <label className={radioCard}>
                  <input type="radio" value="new" className="mt-1 accent-brand" {...register("address_mode")} />
                  <span className="font-medium">Новый адрес</span>
                </label>
              </div>
            )}

            {addressMode === "saved" && addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={radioCard}>
                    <input type="radio" value={a.id} className="mt-1 accent-brand" {...register("address_id")} />
                    <span>
                      <span className="block font-medium">{a.label}</span>
                      <span className="text-sm text-body/70">{addressLine(a)}</span>
                    </span>
                  </label>
                ))}
                {errors.address_id && <p className="text-xs text-rose-600" role="alert">{errors.address_id.message}</p>}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField id="street" label="Улица" error={errors.street?.message}>
                    <input id="street" autoComplete="address-line1" className="input" {...register("street")} />
                  </FormField>
                </div>
                <FormField id="house" label="Дом" error={errors.house?.message}><input id="house" className="input" {...register("house")} /></FormField>
                <FormField id="apartment" label="Квартира" error={errors.apartment?.message}><input id="apartment" className="input" {...register("apartment")} /></FormField>
                <FormField id="entrance" label="Подъезд" error={errors.entrance?.message}><input id="entrance" className="input" {...register("entrance")} /></FormField>
                <FormField id="floor" label="Этаж" error={errors.floor?.message}><input id="floor" className="input" {...register("floor")} /></FormField>
                <div className="sm:col-span-2">
                  <FormField id="address_note" label="Ориентир" error={errors.address_note?.message}>
                    <input id="address_note" placeholder="Например: код домофона, рядом с магазином" className="input" {...register("address_note")} />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" className="h-4 w-4 accent-brand" {...register("save_address")} /> Сохранить адрес для следующих заказов
                </label>
              </div>
            )}
          </section>
        )}

        <section className={`${card} grid gap-4 sm:grid-cols-2`} aria-labelledby="h-time">
          <h2 id="h-time" className="text-lg font-semibold sm:col-span-2">{delivery ? "Когда доставить" : "Когда заберёте"}</h2>
          <FormField id="delivery_date" label="Дата" error={errors.delivery_date?.message}>
            <input id="delivery_date" type="date" min={today} className="input" {...register("delivery_date")} />
          </FormField>
          <FormField id="delivery_time_slot" label="Удобное время" error={errors.delivery_time_slot?.message}>
            {slots.length > 0 ? (
              <select id="delivery_time_slot" className="input" {...register("delivery_time_slot")}>
                {slots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input id="delivery_time_slot" placeholder="Например: после 18:00" className="input" {...register("delivery_time_slot")} />
            )}
          </FormField>
        </section>

        <section className={`${card} grid gap-4 sm:grid-cols-2`} aria-labelledby="h-contact">
          <h2 id="h-contact" className="text-lg font-semibold sm:col-span-2">Контакты</h2>
          <FormField id="customer_name" label="Имя" error={errors.customer_name?.message}>
            <input id="customer_name" autoComplete="name" className="input" {...register("customer_name")} />
          </FormField>
          <FormField id="customer_phone" label="Телефон" error={errors.customer_phone?.message}>
            <input id="customer_phone" type="tel" autoComplete="tel" placeholder="+992 ..." className="input" {...register("customer_phone")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="comment" label="Комментарий к заказу" error={errors.comment?.message}>
              <textarea id="comment" rows={3} maxLength={500} className="input" {...register("comment")} />
            </FormField>
          </div>
        </section>

        <section className={card} aria-labelledby="h-pay">
          <h2 id="h-pay" className="mb-4 text-lg font-semibold">Оплата</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-xl border border-brand bg-tint/50 p-4">
              <Banknote className="mt-0.5 text-brand" size={20} />
              <span>
                <span className="block font-semibold">{delivery ? "Наличными при доставке" : "Оплата при самовывозе"}</span>
                <span className="text-sm text-body/60">Платите при получении заказа</span>
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-heading/10 p-4 opacity-50" aria-disabled="true">
              <CreditCard className="mt-0.5" size={20} />
              <span>
                <span className="block font-semibold">Онлайн-оплата</span>
                <span className="text-sm">Скоро</span>
              </span>
            </div>
          </div>
        </section>
      </div>

      <aside className="card h-fit space-y-5 p-4 sm:p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl font-bold text-heading">Ваш заказ</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId} className={`flex justify-between gap-3 ${i.outOfStock ? "text-rose-600" : ""}`}>
              <span className="min-w-0">{i.name} <span className="text-body/50">× {formatQty(i.quantity, i.unit)}</span></span>
              <span className="shrink-0 font-medium">{i.outOfStock ? "нет в наличии" : formatMoney(Math.round(i.price * i.quantity * 100) / 100)}</span>
            </li>
          ))}
        </ul>
        <PromoBox promo={promo} isLoggedIn nextPath="/checkout" />
        <dl className="space-y-2 border-t border-heading/10 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-body/70">Товары</dt><dd>{formatMoney(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between text-brand"><dt>Промокод</dt><dd>−{formatMoney(totals.discount)}</dd></div>}
          {delivery && (
            <div className="flex justify-between">
              <dt className="text-body/70">Доставка</dt>
              <dd>{zone ? (totals.fee > 0 ? formatMoney(totals.fee) : "бесплатно") : "выберите район"}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-heading/10 pt-3 text-lg font-bold"><dt>Итого</dt><dd>{formatMoney(totals.total)}</dd></div>
        </dl>

        {delivery && totals.belowMin && (
          <p className="text-sm text-amber-700" role="alert">Минимальная сумма заказа для этого района: {formatMoney(totals.minOrder)}</p>
        )}
        {hasSoldOut && <p className="text-sm text-rose-600" role="alert">Удалите из корзины товары, которых нет в наличии.</p>}
        {serverError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{serverError}</p>}

        <button type="submit" disabled={blocked} className="btn-primary w-full !py-4 text-base">
          {isSubmitting ? "Оформляем…" : "Подтвердить заказ"}
        </button>
        <p className="text-xs text-body/60">
          Нажимая «Подтвердить заказ», вы соглашаетесь с <Link href="/offer" className="underline">офертой</Link>.
        </p>
        <Link href="/cart" className="block text-center text-sm text-brand hover:underline">← Вернуться в корзину</Link>
      </aside>
    </form>
  );
}
