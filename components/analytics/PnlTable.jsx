import { formatMoney } from "@/lib/utils/format";

const n = (v) => Number(v ?? 0);

// Отчёт о прибыли: каждая строка — отдельный показатель, формулы подписаны (см. README «Правила расчёта»).
export default function PnlTable({ kpis }) {
  const rows = [
    { label: "Выручка по доставленным заказам", value: n(kpis.revenue_before_returns), note: "Σ итогов заказов, доставленных за период (с доставкой, после промокода)" },
    { label: "Возвраты клиентам", value: -n(kpis.returns_amount), note: "Деньги, возвращённые за период" },
    { label: "Выручка", value: n(kpis.revenue), strong: true, note: "Выручка по заказам − возвраты" },
    { label: "Себестоимость проданного", value: -n(kpis.cogs), note: "Σ себестоимость × кол-во, за вычетом возвращённого на склад" },
    { label: "Валовая прибыль", value: n(kpis.gross_profit), strong: true, note: "Выручка − себестоимость" },
    { label: "Операционные расходы", value: -n(kpis.expenses), note: "Расходы за период, кроме аннулированных" },
    { label: "Списания (порча, потери)", value: -n(kpis.writeoffs), note: "Себестоимость списанного товара. Возврат поставщику потерей не считается" },
    { label: "Чистая прибыль", value: n(kpis.net_profit), strong: true, note: "Валовая прибыль − расходы − списания" },
  ];
  const margin = n(kpis.revenue) > 0 ? (n(kpis.net_profit) / n(kpis.revenue)) * 100 : null;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-heading/5">
          {rows.map((r) => (
            <tr key={r.label} className={r.strong ? "bg-tint/50" : ""}>
              <td className={`px-4 py-3 ${r.strong ? "font-bold" : ""}`}>{r.label}<p className="text-xs font-normal text-body/50">{r.note}</p></td>
              <td className={`whitespace-nowrap px-4 py-3 text-right ${r.strong ? "text-base font-bold" : ""} ${r.value < 0 ? "text-rose-600" : ""}`}>{formatMoney(r.value)}</td>
            </tr>
          ))}
          {margin !== null && <tr><td className="px-4 py-3 text-body/70">Рентабельность (чистая прибыль / выручка)</td><td className="px-4 py-3 text-right font-semibold">{margin.toFixed(1)}%</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
