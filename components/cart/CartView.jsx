"use client";

import Link from "next/link";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { cartSubtotal, useCart } from "@/store/cart";
import { useCartSync } from "@/hooks/useCartSync";
import { usePromo } from "@/hooks/usePromo";
import { calcTotals } from "@/lib/utils/pricing";
import { formatMoney, unitLabel } from "@/lib/utils/format";
import ProductImage from "@/components/store/ProductImage";
import QuantityStepper from "@/components/store/QuantityStepper";
import PromoBox from "@/components/cart/PromoBox";
import SyncNotes from "@/components/cart/SyncNotes";

export default function CartView({ isLoggedIn }) {
  const { hydrated, status, notes } = useCartSync();
  const items = useCart((s) => s.items);
  const subtotal = useCart(cartSubtotal);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const promo = usePromo(subtotal, isLoggedIn);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl2 bg-surface/60" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-brand">
          <ShoppingBasket size={30} />
        </span>
        <h2 className="text-xl font-semibold">Корзина пуста</h2>
        <p className="text-body/60">Добавьте товары из каталога.</p>
        <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
      </div>
    );
  }

  const totals = calcTotals({ subtotal, promoDiscount: promo.status === "ok" ? promo.discount : 0, deliveryType: "pickup" });
  const hasSoldOut = items.some((i) => i.outOfStock);

  return (
    <>
      <SyncNotes notes={notes} />
      {status === "error" && (
        <p className="mb-6 rounded-xl2 bg-amber-50 px-5 py-4 text-sm text-amber-900" role="status">
          Не удалось обновить цены и наличие. Итоговая сумма будет пересчитана при оформлении заказа.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.productId} className={`card flex gap-4 p-4 ${i.outOfStock ? "opacity-70" : ""}`}>
              <Link href={`/product/${i.slug}`} className="block h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-label={i.name}>
                <ProductImage src={i.image} alt={i.name} className="h-full w-full rounded-xl" sizes="112px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/product/${i.slug}`} className="font-semibold hover:text-brand">{i.name}</Link>
                  <button
                    type="button"
                    onClick={() => remove(i.productId)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body/50 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Удалить ${i.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <p className="text-sm text-body/60">{formatMoney(i.price)} / {unitLabel(i.unit)}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  {i.outOfStock ? (
                    <span className="text-sm font-medium text-rose-600">Нет в наличии</span>
                  ) : (
                    <QuantityStepper
                      value={i.quantity}
                      onChange={(q) => setQuantity(i.productId, q)}
                      step={i.step}
                      max={i.stock}
                      unit={i.unit}
                      label={`Количество: ${i.name}`}
                    />
                  )}
                  <span className="text-lg font-bold text-heading">
                    {i.outOfStock ? "—" : formatMoney(Math.round(i.price * i.quantity * 100) / 100)}
                  </span>
                </div>
              </div>
            </li>
          ))}
          <li>
            <button type="button" onClick={clear} className="text-sm text-body/60 underline hover:text-rose-600">
              Очистить корзину
            </button>
          </li>
        </ul>

        <aside className="card h-fit space-y-5 p-4 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-bold text-heading">Ваш заказ</h2>
          <PromoBox promo={promo} isLoggedIn={isLoggedIn} />
          <dl className="space-y-2 border-t border-heading/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-body/70">Товары</dt><dd>{formatMoney(totals.subtotal)}</dd></div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-brand"><dt>Промокод</dt><dd>−{formatMoney(totals.discount)}</dd></div>
            )}
            <div className="flex justify-between text-body/60"><dt>Доставка</dt><dd>рассчитывается при оформлении</dd></div>
            <div className="flex justify-between border-t border-heading/10 pt-3 text-lg font-bold">
              <dt>Итого</dt><dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>
          {hasSoldOut && <p className="text-sm text-rose-600" role="alert">Удалите товары, которых нет в наличии.</p>}
          {hasSoldOut || subtotal <= 0 ? (
            <button type="button" disabled className="btn-primary w-full">Оформить заказ</button>
          ) : (
            <Link href="/checkout" className="btn-primary w-full">Оформить заказ</Link>
          )}
          <Link href="/catalog" className="block text-center text-sm text-brand hover:underline">Продолжить покупки</Link>
        </aside>
      </div>
    </>
  );
}
