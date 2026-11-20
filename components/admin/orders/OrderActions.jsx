"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES } from "@/lib/constants";
import { assignCourier, changeOrderStatus } from "@/app/admin/orders/actions";

const FLOW_DELIVERY = ["pending", "confirmed", "assembling", "ready", "handed_to_courier", "on_the_way", "delivered"];
const FLOW_PICKUP = ["pending", "confirmed", "assembling", "ready", "delivered"];
const label = (s, pickup) => (s === "delivered" && pickup ? "Выдан клиенту" : ORDER_STATUSES.find((x) => x.value === s)?.label ?? s);

export default function OrderActions({ order }) {
  const router = useRouter();
  const pickup = order.delivery_type === "pickup";
  const flow = pickup ? FLOW_PICKUP : FLOW_DELIVERY;
  const idx = flow.indexOf(order.status);
  const finished = ["delivered", "cancelled"].includes(order.status);
  const next = flow.slice(idx + 1);

  const [status, setStatus] = useState(next[0] ?? "");
  const [note, setNote] = useState("");
  const [cName, setCName] = useState(order.courier_name ?? "");
  const [cPhone, setCPhone] = useState(order.courier_phone ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const run = (fn, okText) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: okText });
      router.refresh();
    });

  if (finished) {
    return <p className="text-sm text-brand-ink/60">Заказ завершён — статус изменить нельзя.{order.status === "delivered" && " Возврат товара оформляется ниже."}</p>;
  }

  const needCourier = !pickup && ["handed_to_courier", "on_the_way"].includes(status) && !order.courier_name && !cName.trim();

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="st" className="mb-1.5 block text-sm font-medium">Новый статус</label>
            <select id="st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {next.map((s) => <option key={s} value={s}>{label(s, pickup)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="stn" className="mb-1.5 block text-sm font-medium">Комментарий (виден в истории)</label>
            <input id="stn" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {!pickup && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="cn" className="mb-1.5 block text-sm font-medium">Курьер</label><input id="cn" className="input" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Имя курьера" /></div>
            <div><label htmlFor="cp" className="mb-1.5 block text-sm font-medium">Телефон курьера</label><input id="cp" className="input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary !py-2.5" disabled={pending || !status || needCourier}
            onClick={() => run(() => changeOrderStatus({ orderId: order.id, status, note, courierName: cName, courierPhone: cPhone }), "Статус обновлён")}>
            {pending ? "Сохраняем…" : "Сменить статус"}
          </button>
          {!pickup && (cName.trim() !== (order.courier_name ?? "") || cPhone.trim() !== (order.courier_phone ?? "")) && cName.trim() && (
            <button className="btn-outline !py-2.5" disabled={pending} onClick={() => run(() => assignCourier({ orderId: order.id, name: cName, phone: cPhone }), "Курьер назначен")}>Только назначить курьера</button>
          )}
        </div>
        {needCourier && <p className="text-xs text-amber-700">Укажите курьера перед передачей заказа.</p>}
      </div>

      <div className="border-t border-brand-dark/10 pt-4">
        {!showCancel ? (
          <button className="text-sm font-semibold text-rose-600 hover:underline" onClick={() => setShowCancel(true)}>Отменить заказ…</button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <label htmlFor="cr" className="block text-sm font-medium">Причина отмены</label>
            <input id="cr" className="input" maxLength={300} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <p className="text-xs text-brand-ink/60">Товар вернётся на склад, клиент получит уведомление.</p>
            <div className="flex gap-2">
              <button className="btn !bg-rose-600 !py-2.5 text-white hover:!bg-rose-700" disabled={pending || cancelReason.trim().length < 3}
                onClick={() => run(() => changeOrderStatus({ orderId: order.id, status: "cancelled", note: cancelReason }), "Заказ отменён")}>Отменить заказ</button>
              <button className="btn-outline !py-2.5" onClick={() => setShowCancel(false)}>Не отменять</button>
            </div>
          </div>
        )}
      </div>
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-brand-light text-brand-dark" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}
