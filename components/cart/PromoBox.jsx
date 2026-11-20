"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Tag, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatMoney } from "@/lib/utils/format";

export default function PromoBox({ promo, isLoggedIn, nextPath = "/cart" }) {
  const setPromo = useCart((s) => s.setPromo);
  const [value, setValue] = useState("");

  if (!isLoggedIn) {
    return (
      <p className="rounded-xl bg-tint px-4 py-3 text-sm text-heading">
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold underline">Войдите</Link>
        , чтобы применить промокод.
      </p>
    );
  }

  if (promo.code) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-heading/15 bg-surface px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Tag size={16} className="text-brand" /> {promo.code}
          </span>
          <button
            type="button"
            onClick={() => setPromo("")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-body/60 hover:bg-tint"
            aria-label="Убрать промокод"
          >
            <X size={16} />
          </button>
        </div>
        {promo.status === "ok" && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-brand" role="status">
            <Check size={15} /> Скидка {formatMoney(promo.discount)}
          </p>
        )}
        {promo.status === "error" && <p className="mt-2 text-sm text-rose-600" role="alert">{promo.error}</p>}
        {promo.status === "loading" && <p className="mt-2 text-sm text-body/60">Проверяем промокод…</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          setPromo(value);
          setValue("");
        }
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Промокод"
        maxLength={40}
        className="input uppercase"
        aria-label="Промокод"
        autoComplete="off"
      />
      <button type="submit" className="btn-outline shrink-0 !px-5">Применить</button>
    </form>
  );
}
