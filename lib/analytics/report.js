import { previousPeriod } from "@/lib/analytics/period";

// Один RPC — единый согласованный срез данных (см. миграцию 6: report_dashboard).
export async function getReport(supabase, { from, to }) {
  const { data, error } = await supabase.rpc("report_dashboard", { p_from: from, p_to: to });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

export async function getReportWithPrev(supabase, period) {
  const [cur, prev] = await Promise.all([getReport(supabase, period), getReport(supabase, previousPeriod(period))]);
  return { cur, prev };
}

// Группировка дневного ряда по неделям/месяцам
export function aggregateSeries(series, gran) {
  if (gran === "day") return series.map((r) => ({ ...r, label: r.day.slice(5).split("-").reverse().join(".") }));
  const buckets = new Map();
  for (const r of series) {
    const d = new Date(`${r.day}T00:00:00Z`);
    let key;
    if (gran === "month") key = r.day.slice(0, 7);
    else { const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); key = d.toISOString().slice(0, 10); }
    const b = buckets.get(key) ?? { day: key, revenue: 0, cogs: 0, orders: 0, delivered: 0, cancelled: 0, new_customers: 0 };
    for (const f of ["revenue", "cogs", "orders", "delivered", "cancelled", "new_customers"]) b[f] += Number(r[f]);
    buckets.set(key, b);
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    label: gran === "month" ? b.day.slice(0, 7).split("-").reverse().join(".") : `нед. ${b.day.slice(5).split("-").reverse().join(".")}`,
  }));
}

export const num = (v) => Number(v ?? 0);
export const pct = (cur, prev) => (num(prev) === 0 ? null : ((num(cur) - num(prev)) / Math.abs(num(prev))) * 100);
