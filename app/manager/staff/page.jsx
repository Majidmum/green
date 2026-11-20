import { createClient } from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics/period";
import { getReport } from "@/lib/analytics/report";
import { formatDate } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import PeriodFilter from "@/components/analytics/PeriodFilter";

export const metadata = { title: "Сотрудники" };

export default async function StaffPage({ searchParams }) {
  const period = parsePeriod(searchParams, "30d");
  const rep = await getReport(createClient(), period);
  return (
    <>
      <PageHeader title="Сотрудники" description="Активность за выбранный период: заказы, которые обработал сотрудник, складские операции и изменения в настройках." />
      <PeriodFilter period={period} basePath="/manager/staff" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-brand-dark/10 text-xs uppercase tracking-wide text-brand-ink/50"><tr><th className="px-4 py-3">Сотрудник</th><th className="px-4 py-3">Роль</th><th className="px-4 py-3 text-right">Заказов обработано</th><th className="px-4 py-3 text-right">Складских операций</th><th className="px-4 py-3 text-right">Действий в системе</th><th className="px-4 py-3">Последняя активность</th></tr></thead>
          <tbody className="divide-y divide-brand-dark/5">
            {rep.staff.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-ink/50">Сотрудников нет</td></tr>}
            {rep.staff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.full_name || "—"}{!s.is_active && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">заблокирован</span>}</td>
                <td className="px-4 py-3">{s.role === "admin" ? "Администратор" : "Руководитель"}</td>
                <td className="px-4 py-3 text-right">{Number(s.orders_handled)}</td>
                <td className="px-4 py-3 text-right">{Number(s.stock_ops)}</td>
                <td className="px-4 py-3 text-right">{Number(s.actions)}</td>
                <td className="px-4 py-3 text-brand-ink/70">{s.last_activity ? formatDate(s.last_activity) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
