"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";

// items: [{ product_id, quantity }]. Берём актуальные цены и остатки из витрины.
export default function RepeatOrderButton({ items }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function repeat() {
    setBusy(true);
    setMsg("");
    const ids = items.map((i) => i.product_id).filter(Boolean);
    const { data, error } = await createClient()
      .from("product_catalog")
      .select("id,name,slug,unit,step,price,stock,image_url")
      .in("id", ids);
    if (error) { setBusy(false); return setMsg("Не удалось загрузить товары"); }
    let added = 0, skipped = 0;
    for (const it of items) {
      const p = (data ?? []).find((x) => x.id === it.product_id);
      if (!p) { skipped++; continue; }
      const res = useCart.getState().add(p, Number(it.quantity));
      res.ok ? added++ : skipped++;
    }
    setBusy(false);
    if (added === 0) return setMsg("Этих товаров сейчас нет в наличии");
    router.push("/cart");
  }

  return (
    <div>
      <button className="btn-primary" onClick={repeat} disabled={busy}><RotateCcw size={16} /> {busy ? "Добавляем…" : "Повторить заказ"}</button>
      {msg && <p className="mt-2 text-sm text-rose-600" role="alert">{msg}</p>}
    </div>
  );
}
