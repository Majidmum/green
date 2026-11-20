"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { useCart } from "@/store/cart";

export default function AddToCartButton({ product, qty, className = "" }) {
  const add = useCart((s) => s.add);
  const [state, setState] = useState("idle"); // idle | added | capped
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const step = Number(product.step) || 1;
  const soldOut = Number(product.stock) < step;

  if (soldOut) {
    return (
      <button type="button" disabled className={`btn-outline w-full ${className}`}>
        Нет в наличии
      </button>
    );
  }

  function onClick() {
    const r = add(product, qty);
    setState(r.capped ? "capped" : "added");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <div className={className}>
      <button type="button" onClick={onClick} className="btn-primary w-full">
        {state === "added" ? (
          <>
            <Check size={16} aria-hidden="true" /> Добавлено
          </>
        ) : (
          <>
            <ShoppingBasket size={16} aria-hidden="true" /> В корзину
          </>
        )}
      </button>
      <p className="sr-only" aria-live="polite">
        {state === "added" && "Товар добавлен в корзину"}
        {state === "capped" && "Добавлено максимальное количество в наличии"}
      </p>
      {state === "capped" && (
        <p className="mt-1 text-center text-xs text-amber-700">В корзине весь доступный остаток</p>
      )}
    </div>
  );
}
