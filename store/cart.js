"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { round3 } from "@/lib/utils/format";

// Корзина хранится в localStorage. Цены здесь — только для отображения:
// при оформлении заказа сервер пересчитывает всё сам (create_order).
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      promoCode: "",

      /** Добавляет товар. Возвращает { ok, quantity, capped } для обратной связи в UI. */
      add(product, qty) {
        const step = Number(product.step) || 1;
        const stock = Number(product.stock) || 0;
        if (stock < step) return { ok: false, quantity: 0, capped: false };

        const add = qty ?? step;
        const existing = get().items.find((i) => i.productId === product.id);
        const wanted = round3((existing?.quantity ?? 0) + add);
        const next = Math.min(wanted, stock);
        const capped = wanted > stock;

        const item = {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: Number(product.price),
          unit: product.unit,
          step,
          stock,
          image: product.image_url ?? null,
          quantity: next,
          outOfStock: false,
        };
        set((s) => ({
          items: existing
            ? s.items.map((i) => (i.productId === product.id ? item : i))
            : [...s.items, item],
        }));
        return { ok: true, quantity: next, capped };
      },

      setQuantity(productId, quantity) {
        set((s) => ({
          items: s.items.map((i) => {
            if (i.productId !== productId) return i;
            const q = Math.min(Math.max(round3(quantity), i.step), i.stock);
            return { ...i, quantity: q };
          }),
        }));
      },

      remove(productId) {
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) }));
      },

      clear() {
        set({ items: [], promoCode: "" });
      },

      setPromo(code) {
        set({ promoCode: String(code ?? "").trim().toUpperCase().slice(0, 40) });
      },

      /**
       * Сверяет корзину с актуальными данными из БД (цена, остаток, доступность).
       * Возвращает список изменений для показа пользователю.
       */
      sync(rows) {
        const byId = new Map(rows.map((r) => [r.id, r]));
        const notes = [];
        const next = [];
        for (const i of get().items) {
          const r = byId.get(i.productId);
          if (!r) {
            notes.push({ type: "removed", name: i.name });
            continue;
          }
          const step = Number(r.step) || 1;
          const stock = Number(r.stock) || 0;
          const price = Number(r.price);
          const out = stock < step;
          const quantity = out ? i.quantity : Math.min(i.quantity, stock);
          if (!out && quantity !== i.quantity) notes.push({ type: "reduced", name: r.name, quantity });
          if (out && !i.outOfStock) notes.push({ type: "soldout", name: r.name });
          if (price !== i.price) notes.push({ type: "price", name: r.name, from: i.price, to: price });
          next.push({
            ...i,
            name: r.name,
            slug: r.slug,
            unit: r.unit,
            step,
            stock,
            price,
            image: r.image_url ?? null,
            quantity,
            outOfStock: out,
          });
        }
        set({ items: next });
        return notes;
      },
    }),
    {
      name: "gg-cart",
      version: 2,
      partialize: (s) => ({ items: s.items, promoCode: s.promoCode }),
      migrate: (state) => ({ items: state?.items ?? [], promoCode: state?.promoCode ?? "" }),
    }
  )
);

export const cartCount = (s) => s.items.length;
export const cartSubtotal = (s) =>
  Math.round(
    s.items.filter((i) => !i.outOfStock).reduce((sum, i) => sum + i.price * i.quantity, 0) * 100
  ) / 100;
