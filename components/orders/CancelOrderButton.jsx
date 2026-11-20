"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/app/(store)/(account)/actions";

export default function CancelOrderButton({ orderId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) return <button className="btn-outline !border-rose-300 !text-rose-600" onClick={() => setOpen(true)}>Отменить заказ</button>;

  return (
    <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
      <label htmlFor="cancel-reason" className="block text-sm font-medium">Причина отмены (необязательно)</label>
      <textarea id="cancel-reason" className="input" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button
          className="btn !bg-rose-600 !py-2.5 text-white hover:!bg-rose-700"
          disabled={pending}
          onClick={() => start(async () => {
            setError("");
            const res = await cancelOrder(orderId, reason);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })}
        >
          {pending ? "Отменяем…" : "Да, отменить"}
        </button>
        <button className="btn-outline !py-2.5" onClick={() => setOpen(false)} disabled={pending}>Не отменять</button>
      </div>
    </div>
  );
}
