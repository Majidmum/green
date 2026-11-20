import { createClient } from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics/period";
import { getReportWithPrev } from "@/lib/analytics/report";
import PageHeader from "@/components/admin/PageHeader";
import PeriodFilter from "@/components/analytics/PeriodFilter";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata = { title: "Дашборд" };

export default async function ManagerDashboard({ searchParams }) {
  const period = parsePeriod(searchParams);
  const { cur, prev } = await getReportWithPrev(createClient(), period);
  return (
    <>
      <PageHeader title="Дашборд" description="Стрелки показывают изменение к предыдущему периоду такой же длины. Выручка, прибыль и остатки считаются отдельно." />
      <PeriodFilter period={period} basePath="/manager" />
      <AnalyticsDashboard cur={cur} prev={prev} />
    </>
  );
}
