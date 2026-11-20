import { createClient } from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics/period";
import { getReport } from "@/lib/analytics/report";
import { formatDay, formatMoney, formatQty } from "@/lib/utils/format";
import { Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import PrintButton from "@/components/admin/PrintButton";
import PeriodFilter from "@/components/analytics/PeriodFilter";
import PnlTable from "@/components/analytics/PnlTable";

const T = ({ title, head, rows, empty }) => (
  <section className="break-inside-avoid">
    <h2 className="mb-2 mt-6 font-display text-xl font-bold text-heading">{title}</h2>
    <div className="card overflow-x-auto print:shadow-none">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50"><tr>{head.map((h, i) => <th key={h} className={`px-4 py-2.5 ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-heading/5">
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-6 text-center text-body/50">{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={`px-4 py-2 ${j ? "text-right" : ""}`}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  </section>
);

// Отчёты за период: таблицы, экспорт в Excel, печать / сохранение в PDF (через диалог печати браузера).
export default async function ReportsView({ searchParams, basePath }) {
  const period = parsePeriod(searchParams, "month");
  const rep = await getReport(createClient(), period);
  const qs = new URLSearchParams({ from: period.from, to: period.to }).toString();
  const active = rep.series.filter((d) => Number(d.orders) || Number(d.delivered) || Number(d.revenue));

  return (
    <>
      <PageHeader title="Отчёты" description="Сводка за период, продажи по дням, товары и категории. Экспорт — в Excel; для PDF нажмите «Печать» и выберите «Сохранить как PDF».">
        <a href={`/api/reports/export?${qs}`} className="btn-primary !py-2.5"><Download size={16} /> Excel</a>
        <PrintButton label="Печать / PDF" />
      </PageHeader>
      <PeriodFilter period={period} basePath={basePath} />
      <h2 className="mb-2 font-display text-xl font-bold text-heading">Прибыль за {formatDay(period.from)} — {formatDay(period.to)}</h2>
      <PnlTable kpis={rep.kpis} />
      <T title="Продажи по дням" head={["Дата", "Заказов создано", "Доставлено", "Отменено", "Выручка", "Валовая прибыль"]} empty="Продаж за период нет"
        rows={active.map((d) => [formatDay(d.day), Number(d.orders), Number(d.delivered), Number(d.cancelled), formatMoney(d.revenue), formatMoney(Number(d.revenue) - Number(d.cogs))])} />
      <T title="Топ товаров" head={["Товар", "Продано", "Выручка"]} empty="Данных нет" rows={rep.top_products.map((p) => [p.name, formatQty(p.qty, p.unit), formatMoney(p.revenue)])} />
      <T title="Категории" head={["Категория", "Заказов", "Выручка"]} empty="Данных нет" rows={rep.top_categories.map((c) => [c.name, Number(c.orders), formatMoney(c.revenue)])} />
    </>
  );
}
