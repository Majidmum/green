"use client";

import { useState } from "react";
import QuantityStepper from "@/components/store/QuantityStepper";
import AddToCartButton from "@/components/store/AddToCartButton";
import FavoriteButton from "@/components/store/FavoriteButton";
import { formatMoney } from "@/lib/utils/format";

// Блок покупки на странице товара: количество, итог, «В корзину», «В избранное».
export default function ProductPurchase({ product }) {
  const step = Number(product.step) || 1;
  const stock = Number(product.stock) || 0;
  const [qty, setQty] = useState(step);
  const soldOut = stock < step;

  if (soldOut) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">Нет в наличии</p>
        <FavoriteButton
          productId={product.id}
          withLabel
          className="btn-outline w-full"
        />
      </div>
    );
  }

  const total = Math.round(Number(product.price) * qty * 100) / 100;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuantityStepper value={qty} onChange={setQty} step={step} max={stock} unit={product.unit} />
        <div className="text-right">
          <div className="text-xs text-brand-ink/60">Итого</div>
          <div className="text-xl font-bold text-brand-dark">{formatMoney(total)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <AddToCartButton product={product} qty={qty} className="flex-1" />
        <FavoriteButton productId={product.id} withLabel className="btn-outline sm:w-auto" />
      </div>
    </div>
  );
}
