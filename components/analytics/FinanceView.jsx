import { createClient } from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics/period";
import { getReportWithPrev } from "@/lib/analytics/report";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/admin/resources";
import { formatDay, formatMoney } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import PeriodFilter from "@/components/analytics/PeriodFilter";
import KpiGrid from "@/components/analytics/KpiGrid";
import PnlTable from "@/components/analytics/PnlTable";
import { ExpensesChart, RevenueChart } from "@/components/analytics/Charts";

// Финансы: только чтение (руководитель). Расходы вносит и аннулирует администратор.
export default async function FinanceView({ searchParams, basePath }) {
  const period = parsePeriod(searchParams, "month");
  const supabase = createClient();
  const { cur, prev } = await getReportWithPrev(supabase, period);
  const { data: expenses, error } = await supabase.from("expenses").select("id,expense_date,category,amount,description,is_voided").gte("expense_date", period.from).lte("expense_date", period.to).order("expense_date", { ascending: false }).limit(300);
  if (error) throw new Error(`Supabase: ${error.message}`);

  return (
    <>
      <PageHeader title="Финансы" description="Показатели считаются отдельными запросами и не смешиваются: выручка, себестоимость, расходы, списания. Остатки склада в прибыль не входят." />
      <PeriodFilter period={period} basePath={basePath} />
      <KpiGrid cur={cur} prev={prev} compact />
      <div className="grid gap-5 xl:grid-cols-2">
        <div><h2 className="mb-3 font-display text-xl font-bold text-brand-dark">Прибыль за период</h2><PnlTable kpis={cur.kpis} /></div>
        <ExpensesChart items={cur.expenses_by_category} />
        <div className="xl:col-span-2"><RevenueChart series={cur.series} /></div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-brand-dark">Расходы за период</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-brand-dark/10 text-xs uppercase tracking-wide text-brand-ink/50"><tr><th className="px-4 py-3">Дата</th><th className="px-4 py-3">Категория</th><th className="px-4 py-3">Описание</th><th className="px-4 py-3 text-right">Сумма</th></tr></thead>
          <tbody className="divide-y divide-brand-dark/5">
            {!expenses?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-ink/50">Расходов за период нет</td></tr>}
            {(expenses ?? []).map((e) => (
              <tr key={e.id} className={e.is_voided ? "opacity-50" : ""}>
                <td className="px-4 py-2.5">{formatDay(e.expense_date)}</td>
                <td className="px-4 py-2.5">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</td>
                <td className="px-4 py-2.5 text-brand-ink/70">{e.description ?? "—"}{e.is_voided && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">аннулирован</span>}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${e.is_voided ? "line-through" : ""}`}>{formatMoney(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
