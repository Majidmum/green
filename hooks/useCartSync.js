"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Сверяет корзину с БД при открытии страницы и при изменении набора товаров.
 * Возвращает { hydrated, status: idle|ok|error, notes, refresh }.
 */
export function useCartSync() {
  const hydrated = useHydrated();
  const sync = useCart((s) => s.sync);
  const ids = useCart((s) =>
    s.items.map((i) => i.productId).sort().join(",")
  );
  const [state, setState] = useState({ status: "idle", notes: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hydrated || !ids) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await createClient()
        .from("product_catalog")
        .select("id,name,slug,unit,step,price,stock,image_url")
        .in("id", ids.split(","));
      if (cancelled) return;
      if (error) {
        setState((s) => ({ ...s, status: "error" }));
        return;
      }
      const notes = sync(data ?? []);
      setState((s) => ({ status: "ok", notes: notes.length ? notes : s.notes }));
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, ids, sync, tick]);

  // Принудительная перепроверка (например, после отказа сервера из-за остатков)
  const refresh = () => setTick((t) => t + 1);

  return { hydrated, refresh, ...state };
}
