import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics/period";
import { getReport } from "@/lib/analytics/report";
import { formatMoney } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import PeriodFilter from "@/components/analytics/PeriodFilter";
import KpiCard from "@/components/analytics/KpiCard";
import StockTable from "@/components/admin/stock/StockTable";
import StockJournal from "@/components/admin/stock/StockJournal";

export const metadata = { title: "Склад" };

export default async function ManagerStockPage({ searchParams }) {
  const period = parsePeriod(searchParams, "30d");
  const rep = await getReport(createClient(), period);
  const k = rep.kpis;
  const view = searchParams?.view === "journal" ? "journal" : "stock";
  const keep = { preset: period.preset === "custom" ? undefined : period.preset, from: period.preset === "custom" ? period.from : undefined, to: period.preset === "custom" ? period.to : undefined };
  const tabHref = (v) => `/manager/stock?${new URLSearchParams(Object.fromEntries(Object.entries({ ...keep, view: v }).filter(([, x]) => x))).toString()}`;

  return (
    <>
      <PageHeader title="Склад" description="Режим просмотра. Приход, списание и инвентаризацию проводит администратор. Потери за период — по выбранным датам." />
      <PeriodFilter period={period} basePath="/manager/stock" extra={{ view }} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Списания (порча, потери)" value={formatMoney(k.writeoffs)} hint="себестоимость, за период" tone={Number(k.writeoffs) > 0 ? "bad" : undefined} />
        <KpiCard title="Недостачи" value={formatMoney(k.shortage_amount)} hint="по инвентаризации, за период" tone={Number(k.shortage_amount) > 0 ? "bad" : undefined} />
        <KpiCard title="Излишки" value={formatMoney(k.surplus_amount)} hint="по инвентаризации, за период" />
        <KpiCard title="Стоимость склада" value={formatMoney(k.stock_value)} hint="по средней себестоимости, на сегодня" />
      </div>
      <div className="mb-4 flex gap-2">
        {[["stock", "Остатки"], ["journal", "Журнал движений"]].map(([v, l]) => <Link key={v} href={tabHref(v)} aria-current={view === v ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${view === v ? "bg-brand text-white" : "bg-surface shadow-soft hover:bg-tint"}`}>{l}</Link>)}
      </div>
      {view === "journal" ? <StockJournal searchParams={searchParams} basePath="/manager/stock" /> : <StockTable searchParams={searchParams} basePath="/manager/stock" />}
    </>
  );
}
