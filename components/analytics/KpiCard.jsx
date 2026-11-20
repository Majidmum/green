import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// delta — процент к прошлому периоду (null — нет данных для сравнения); goodWhenUp=false для расходов
export default function KpiCard({ title, value, hint, delta, goodWhenUp = true, tone }) {
  const up = delta !== null && delta !== undefined && delta >= 0;
  const good = delta === null || delta === undefined ? null : up === goodWhenUp;
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-body/50">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "bad" ? "text-rose-600" : "text-heading"}`}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-body/60">
        {delta !== null && delta !== undefined && Math.abs(delta) >= 0.05 && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? "text-emerald-700" : "text-rose-600"}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
