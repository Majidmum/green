"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";

const IDLE = { status: "idle", discount: 0, error: "" };

/**
 * Проверяет промокод из корзины через RPC validate_promo_code при каждом
 * изменении суммы. Скидка здесь — для показа; при заказе её пересчитывает сервер.
 */
export function usePromo(subtotal, enabled) {
  const code = useCart((s) => s.promoCode);
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    if (!code || !enabled || subtotal <= 0) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    const timer = setTimeout(async () => {
      const { data, error } = await createClient().rpc("validate_promo_code", {
        p_code: code,
        p_subtotal: subtotal,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setState({ status: "error", discount: 0, error: "Не удалось проверить промокод" });
      } else if (row.error) {
        setState({ status: "error", discount: 0, error: row.error });
      } else {
        setState({ status: "ok", discount: Number(row.discount), error: "" });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, subtotal, enabled]);

  return { code, ...state };
}
