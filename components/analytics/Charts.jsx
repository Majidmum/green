"use client";

import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { aggregateSeries } from "@/lib/analytics/report";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/admin/resources";

// Палитра проверена скриптом validate_palette (светлая тема): зелёный бренда, синий, янтарный, фиолетовый, розовый, бирюзовый.
export const C = { green: "#00A651", blue: "#2F6FDE", amber: "#B8700A", violet: "#8E5BD6", pink: "#D6456B", teal: "#0C9AAE" };
const GRID = "rgba(23,35,27,0.10)";
const AXIS = { fontSize: 12, fill: "#4b5a50" };
const money = (v) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(v));
const compact = (v) => new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v));

function Tip({ active, payload, label, fmt = money, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-brand-dark/10 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-brand-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-brand-ink/80">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color ?? p.fill ?? p.stroke }} />
          {p.name}: <strong className="text-brand-ink">{fmt(p.value)}{suffix}</strong>
        </p>
      ))}
    </div>
  );
}

// Карточка графика: заголовок, переключатель «график/таблица» (доступная альтернатива), пустое состояние.
function ChartCard({ title, subtitle, empty, table, controls, children }) {
  const [view, setView] = useState("chart");
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="font-display text-lg font-bold text-brand-dark">{title}</h3>{subtitle && <p className="text-xs text-brand-ink/60">{subtitle}</p>}</div>
        <div className="flex items-center gap-2 print:hidden">
          {controls}
          {table && !empty && (
            <button className="rounded-full border border-brand-dark/15 p-2 text-brand-dark hover:bg-brand-light" onClick={() => setView(view === "chart" ? "table" : "chart")} aria-label={view === "chart" ? "Показать таблицей" : "Показать графиком"} title={view === "chart" ? "Таблица" : "График"}>
              {view === "chart" ? <Table2 size={15} /> : <BarChart3 size={15} />}
            </button>
          )}
        </div>
      </div>
      {empty ? <p className="py-12 text-center text-sm text-brand-ink/50">За выбранный период данных нет</p> : view === "table" && table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase text-brand-ink/50"><tr>{table.columns.map((c) => <th key={c} className="py-1.5 pr-3">{c}</th>)}</tr></thead>
            <tbody className="divide-y divide-brand-dark/5">{table.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="py-1.5 pr-3">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
}

function GranToggle({ gran, setGran }) {
  return (
    <div className="flex rounded-full bg-brand-light/60 p-0.5 text-xs font-medium" role="group" aria-label="Группировка">
      {[["day", "Дни"], ["week", "Недели"], ["month", "Месяцы"]].map(([k, l]) => (
        <button key={k} onClick={() => setGran(k)} aria-pressed={gran === k} className={`rounded-full px-2.5 py-1 ${gran === k ? "bg-white shadow-soft text-brand-dark" : "text-brand-ink/60"}`}>{l}</button>
      ))}
    </div>
  );
}

const legend = <Legend verticalAlign="bottom" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />;

export function RevenueChart({ series }) {
  const [gran, setGran] = useState(series.length > 92 ? "month" : series.length > 31 ? "week" : "day");
  const data = aggregateSeries(series, gran).map((r) => ({ label: r.label, revenue: Number(r.revenue), gross: Number(r.revenue) - Number(r.cogs) }));
  const empty = data.every((d) => d.revenue === 0 && d.gross === 0);
  return (
    <ChartCard title="Выручка и валовая прибыль" subtitle="Доставленные заказы за вычетом возвратов, сом." empty={empty} controls={<GranToggle gran={gran} setGran={setGran} />}
      table={{ columns: ["Период", "Выручка", "Валовая прибыль"], rows: data.map((d) => [d.label, money(d.revenue), money(d.gross)]) }}>
      <div className="h-72" role="img" aria-label="График выручки и валовой прибыли по периодам">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
            <Tooltip content={<Tip />} />
            {legend}
            <Area name="Выручка" type="monotone" dataKey="revenue" stroke={C.green} strokeWidth={2} fill={C.green} fillOpacity={0.12} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
            <Area name="Валовая прибыль" type="monotone" dataKey="gross" stroke={C.blue} strokeWidth={2} fill={C.blue} fillOpacity={0.08} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function OrdersChart({ series }) {
  const [gran, setGran] = useState(series.length > 92 ? "month" : series.length > 31 ? "week" : "day");
  const data = aggregateSeries(series, gran).map((r) => ({ label: r.label, created: Number(r.orders), delivered: Number(r.delivered), cancelled: Number(r.cancelled) }));
  const empty = data.every((d) => d.created + d.delivered + d.cancelled === 0);
  return (
    <ChartCard title="Заказы" subtitle="Созданные, доставленные и отменённые" empty={empty} controls={<GranToggle gran={gran} setGran={setGran} />}
      table={{ columns: ["Период", "Создано", "Доставлено", "Отменено"], rows: data.map((d) => [d.label, d.created, d.delivered, d.cancelled]) }}>
      <div className="h-72" role="img" aria-label="График количества заказов по периодам">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barGap={2}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip content={<Tip fmt={(v) => v} />} cursor={{ fill: "rgba(0,166,81,0.06)" }} />
            {legend}
            <Bar name="Создано" dataKey="created" fill={C.blue} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar name="Доставлено" dataKey="delivered" fill={C.green} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar name="Отменено" dataKey="cancelled" fill={C.pink} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function HBars({ data, name, color, title, subtitle, ariaLabel, valueHeader }) {
  const empty = data.length === 0;
  return (
    <ChartCard title={title} subtitle={subtitle} empty={empty} table={{ columns: ["Название", valueHeader], rows: data.map((d) => [d.name, money(d.value)]) }}>
      <div style={{ height: Math.max(data.length * 34 + 24, 120) }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
            <YAxis type="category" dataKey="name" width={130} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(s) => (s.length > 20 ? s.slice(0, 19) + "…" : s)} />
            <Tooltip content={<Tip />} cursor={{ fill: "rgba(0,166,81,0.06)" }} />
            <Bar name={name} dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export const TopProductsChart = ({ items }) => (
  <HBars data={items.map((p) => ({ name: p.name, value: Number(p.revenue) }))} name="Выручка, сом." color={C.green} title="Популярные товары" subtitle="Топ-10 по выручке, сом." ariaLabel="Диаграмма: топ товаров по выручке" valueHeader="Выручка" />
);
export const TopCategoriesChart = ({ items }) => (
  <HBars data={items.map((p) => ({ name: p.name, value: Number(p.revenue) }))} name="Выручка, сом." color={C.blue} title="Категории" subtitle="Выручка по категориям, сом." ariaLabel="Диаграмма: выручка по категориям" valueHeader="Выручка" />
);
export const ExpensesChart = ({ items }) => (
  <HBars data={items.map((p) => ({ name: EXPENSE_CATEGORY_LABELS[p.category] ?? p.category, value: Number(p.amount) }))} name="Расходы, сом." color={C.amber} title="Расходы по категориям" subtitle="Без аннулированных, сом." ariaLabel="Диаграмма: расходы по категориям" valueHeader="Сумма" />
);

export function HoursChart({ items }) {
  const data = items.map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, orders: Number(h.orders) }));
  const empty = data.every((d) => d.orders === 0);
  return (
    <ChartCard title="Заказы по часам" subtitle="Когда клиенты оформляют заказы (время Душанбе)" empty={empty} table={{ columns: ["Час", "Заказов"], rows: data.filter((d) => d.orders).map((d) => [d.label, d.orders]) }}>
      <div className="h-60" role="img" aria-label="Гистограмма заказов по часам суток">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip content={<Tip fmt={(v) => v} />} cursor={{ fill: "rgba(0,166,81,0.06)" }} />
            <Bar name="Заказов" dataKey="orders" fill={C.violet} radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function CustomersChart({ series }) {
  const [gran, setGran] = useState(series.length > 92 ? "month" : series.length > 31 ? "week" : "day");
  const data = aggregateSeries(series, gran).map((r) => ({ label: r.label, value: Number(r.new_customers) }));
  const empty = data.every((d) => d.value === 0);
  return (
    <ChartCard title="Новые клиенты" subtitle="Регистрации за период" empty={empty} controls={<GranToggle gran={gran} setGran={setGran} />} table={{ columns: ["Период", "Новых клиентов"], rows: data.map((d) => [d.label, d.value]) }}>
      <div className="h-60" role="img" aria-label="График новых клиентов">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip content={<Tip fmt={(v) => v} />} />
            <Line name="Новых клиентов" type="monotone" dataKey="value" stroke={C.teal} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
