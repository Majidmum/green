"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge, { statusLabel } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils/format";

const FLOW_DELIVERY = ["pending", "confirmed", "assembling", "ready", "handed_to_courier", "on_the_way", "delivered"];
const FLOW_PICKUP = ["pending", "confirmed", "assembling", "ready", "delivered"];

/**
 * Отслеживание заказа. Обновляется в реальном времени (Supabase Realtime) и,
 * на случай если Realtime не включён, перепроверяется раз в 30 секунд.
 */
export default function OrderTracker({ orderId, deliveryType, initial }) {
  const [state, setState] = useState(initial); // { status, courier_name, courier_phone, history: [{status, created_at, note}] }

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function refetch() {
      const [{ data: o }, { data: h }] = await Promise.all([
        supabase.from("orders").select("status,courier_name,courier_phone").eq("id", orderId).maybeSingle(),
        supabase.from("order_status_history").select("status,created_at,note").eq("order_id", orderId).order("created_at"),
      ]);
      if (alive && o) setState({ ...o, history: h ?? [] });
    }

    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, refetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, refetch)
      .subscribe();
    const timer = setInterval(refetch, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const flow = deliveryType === "delivery" ? FLOW_DELIVERY : FLOW_PICKUP;
  const cancelled = state.status === "cancelled";
  const currentIdx = flow.indexOf(state.status);
  const at = (status) => state.history.find((h) => h.status === status)?.created_at;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StatusBadge status={state.status} />
        <span className="flex items-center gap-1.5 text-xs text-body/50" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> обновляется автоматически
        </span>
      </div>

      {cancelled ? (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700">
          <X className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">Заказ отменён</p>
            <p className="text-sm">{formatDate(at("cancelled"))}{state.history.find((h) => h.status === "cancelled")?.note ? ` · ${state.history.find((h) => h.status === "cancelled").note}` : ""}</p>
          </div>
        </div>
      ) : (
        <ol className="space-y-0">
          {flow.map((s, i) => {
            const done = i <= currentIdx;
            const current = i === currentIdx;
            const label = s === "delivered" && deliveryType === "pickup" ? "Выдан" : statusLabel(s);
            return (
              <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
                {i < flow.length - 1 && (
                  <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < currentIdx ? "bg-brand" : "bg-heading/10"}`} aria-hidden="true" />
                )}
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done ? "border-brand bg-brand text-white" : "border-heading/15 bg-surface text-body/40"
                } ${current ? "ring-4 ring-brand/20" : ""}`}>
                  {done ? <Check size={16} /> : i + 1}
                </span>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${done ? "text-body" : "text-body/40"}`}>{label}</p>
                  {at(s) && <p className="text-xs text-body/60">{formatDate(at(s))}</p>}
                  {s === "handed_to_courier" && done && state.courier_name && (
                    <p className="mt-1 text-xs text-body/70">
                      Курьер: {state.courier_name}
                      {state.courier_phone && <> · <a className="text-brand hover:underline" href={`tel:${state.courier_phone}`}>{state.courier_phone}</a></>}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
