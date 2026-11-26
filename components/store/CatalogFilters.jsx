"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { SORTS, buildCatalogQuery } from "@/lib/utils/catalog-params";

function useNavigate(params) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (overrides) =>
    startTransition(() => router.push(`/catalog${buildCatalogQuery(params, { page: 1, ...overrides })}`));
  return { go, pending };
}

export function SortSelect({ params }) {
  const { go, pending } = useNavigate(params);
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden text-body/60 min-[430px]:inline">Сортировка:</span>
      <select
        value={params.sort}
        onChange={(e) => go({ sort: e.target.value })}
        disabled={pending}
        className="input !w-auto min-w-0 max-w-full !py-2"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}

export function ViewToggle({ params }) {
  const item = "flex h-10 w-10 items-center justify-center rounded-full transition";
  return (
    <div className="flex rounded-full bg-surface p-0.5 shadow-soft" role="group" aria-label="Вид каталога">
      <Link
        href={`/catalog${buildCatalogQuery(params, { view: "grid" })}`}
        className={`${item} ${params.view === "grid" ? "bg-brand text-white" : "text-heading hover:bg-tint"}`}
        aria-label="Плитка"
        aria-pressed={params.view === "grid"}
      >
        <LayoutGrid size={18} />
      </Link>
      <Link
        href={`/catalog${buildCatalogQuery(params, { view: "list" })}`}
        className={`${item} ${params.view === "list" ? "bg-brand text-white" : "text-heading hover:bg-tint"}`}
        aria-label="Список"
        aria-pressed={params.view === "list"}
      >
        <List size={18} />
      </Link>
    </div>
  );
}

export default function CatalogFilters({ tree, params }) {
  const { go, pending } = useNavigate(params);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.q);
  const [min, setMin] = useState(params.min ?? "");
  const [max, setMax] = useState(params.max ?? "");

  const toNum = (v) => {
    if (v === "" || v === null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const link = (overrides) => `/catalog${buildCatalogQuery(params, { page: 1, ...overrides })}`;
  const hasFilters =
    params.q || params.category || params.min !== null || params.max !== null ||
    params.stock || params.sale || params.popular || params.seasonal;

  const catLink = (c, nested) => (
    <Link
      key={c.id}
      href={link({ category: c.slug })}
      aria-current={params.category === c.slug ? "true" : undefined}
      className={`block rounded-lg px-3 py-2 text-sm transition ${nested ? "ml-4" : ""} ${
        params.category === c.slug ? "bg-tint font-semibold text-heading" : "hover:bg-tint/60"
      }`}
    >
      {c.name}
    </Link>
  );

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-outline mb-3 w-full lg:hidden"
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} /> Фильтры
      </button>

      <div className={`${open ? "block" : "hidden"} space-y-6 lg:block ${pending ? "opacity-70" : ""}`}>
        <form
          onSubmit={(e) => { e.preventDefault(); go({ q: q.trim() }); }}
          className="relative"
          role="search"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск товаров"
            maxLength={80}
            className="input pr-11"
            aria-label="Поиск товаров"
          />
          <button type="submit" className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full text-brand hover:bg-tint" aria-label="Искать">
            <Search size={18} />
          </button>
        </form>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-body/50">Категории</h2>
          <nav className="space-y-0.5" aria-label="Категории">
            <Link
              href={link({ category: "" })}
              className={`block rounded-lg px-3 py-2 text-sm transition ${!params.category ? "bg-tint font-semibold text-heading" : "hover:bg-tint/60"}`}
            >
              Все товары
            </Link>
            {tree.map((c) => (
              <div key={c.id}>
                {catLink(c, false)}
                {c.children.map((ch) => catLink(ch, true))}
              </div>
            ))}
          </nav>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-body/50">Цена, сом.</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); go({ min: toNum(min), max: toNum(max) }); }}
            className="flex items-center gap-2"
          >
            <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="decimal" placeholder="от" className="input !px-3" aria-label="Цена от" />
            <span className="text-body/40">—</span>
            <input value={max} onChange={(e) => setMax(e.target.value)} inputMode="decimal" placeholder="до" className="input !px-3" aria-label="Цена до" />
            <button type="submit" className="btn-primary !px-4">ОК</button>
          </form>
        </section>

        <section className="space-y-2">
          {[
            ["stock", "Только в наличии"],
            ["sale", "Со скидкой"],
            ["popular", "Популярные"],
            ["seasonal", "Сезонные"],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={params[key]}
                onChange={(e) => go({ [key]: e.target.checked })}
                className="h-4 w-4 rounded border-heading/30 accent-brand"
              />
              {label}
            </label>
          ))}
        </section>

        {hasFilters && (
          <Link href={`/catalog${params.view === "list" ? "?view=list" : ""}`} className="block text-center text-sm font-medium text-brand hover:underline">
            Сбросить фильтры
          </Link>
        )}
      </div>
    </aside>
  );
}
