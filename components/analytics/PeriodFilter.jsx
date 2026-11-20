import Link from "next/link";
import { PRESETS } from "@/lib/analytics/period";
import { formatDay } from "@/lib/utils/format";

// Серверный компонент: пресеты — ссылки, произвольный период — обычная GET-форма.
export default function PeriodFilter({ period, basePath, extra = {} }) {
  const qs = (o) => new URLSearchParams({ ...extra, ...o }).toString();
  return (
    <div className="card mb-6 space-y-3 p-4 print:hidden">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Link key={p.key} href={`${basePath}?${qs({ preset: p.key })}`} aria-current={period.preset === p.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${period.preset === p.key ? "bg-brand text-white" : "bg-brand-light/60 text-brand-dark hover:bg-brand-light"}`}>
            {p.label}
          </Link>
        ))}
      </div>
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
        {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div><label htmlFor="pf-from" className="mb-1 block text-xs font-medium text-brand-ink/60">С</label><input id="pf-from" type="date" name="from" defaultValue={period.from} className="input !py-2" required /></div>
        <div><label htmlFor="pf-to" className="mb-1 block text-xs font-medium text-brand-ink/60">По</label><input id="pf-to" type="date" name="to" defaultValue={period.to} className="input !py-2" required /></div>
        <button className="btn-primary !py-2.5">Показать</button>
        <p className="ml-auto text-sm text-brand-ink/60">Период: {formatDay(period.from)} — {formatDay(period.to)}</p>
      </form>
    </div>
  );
}
