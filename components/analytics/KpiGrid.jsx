import KpiCard from "@/components/analytics/KpiCard";
import { formatMoney } from "@/lib/utils/format";
import { num, pct } from "@/lib/analytics/report";
import { UNITS } from "@/lib/constants";

function sold(map) {
  const parts = Object.entries(map ?? {}).map(([u, q]) => `${Math.round(num(q) * 10) / 10} ${UNITS.find((x) => x.value === u)?.label ?? u}`);
  return parts.length ? parts.join(" · ") : "0";
}

// prev — отчёт за предыдущий период такой же длины (для стрелок «выше/ниже»); может быть null
export default function KpiGrid({ cur, prev, compact = false }) {
  const k = cur.kpis, p = prev?.kpis;
  const d = (key) => (p ? pct(k[key], p[key]) : null);
  const cards = [
    { title: "Выручка", value: formatMoney(k.revenue), delta: d("revenue"), hint: p && "к прошлому периоду" },
    { title: "Валовая прибыль", value: formatMoney(k.gross_profit), delta: d("gross_profit") },
    { title: "Чистая прибыль", value: formatMoney(k.net_profit), delta: d("net_profit"), tone: num(k.net_profit) < 0 ? "bad" : undefined },
    { title: "Расходы", value: formatMoney(k.expenses), delta: d("expenses"), goodWhenUp: false },
    { title: "Заказов создано", value: num(k.orders_created), delta: d("orders_created"), hint: `доставлено: ${num(k.orders_delivered)}` },
    { title: "Средний чек", value: formatMoney(k.avg_check), delta: d("avg_check") },
    { title: "Активные заказы", value: num(k.orders_active), hint: "в работе сейчас" },
    { title: "Отменено", value: num(k.orders_cancelled), delta: d("orders_cancelled"), goodWhenUp: false },
    ...(compact ? [] : [
      { title: "Возвраты", value: formatMoney(k.returns_amount), delta: d("returns_amount"), goodWhenUp: false },
      { title: "Списания", value: formatMoney(k.writeoffs), delta: d("writeoffs"), goodWhenUp: false, hint: "порча и потери" },
      { title: "Продано", value: sold(k.sold_by_unit), hint: "доставленные заказы" },
      { title: "Новые клиенты", value: num(k.customers_new), delta: d("customers_new"), hint: `всего: ${num(k.customers_total)}` },
      { title: "Покупали в периоде", value: num(k.customers_buying), hint: "клиентов с доставленным заказом" },
      { title: "Стоимость склада", value: formatMoney(k.stock_value), hint: `позиций в наличии: ${num(k.stock_positions)} · на сегодня` },
    ]),
  ];
  return <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((c) => <KpiCard key={c.title} {...c} />)}</div>;
}
