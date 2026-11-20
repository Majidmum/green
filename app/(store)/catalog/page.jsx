import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryTree, getCatalogProducts, getCategories } from "@/lib/data/catalog";
import { parseCatalogParams } from "@/lib/utils/catalog-params";
import { plural } from "@/lib/utils/format";
import CatalogFilters, { SortSelect, ViewToggle } from "@/components/store/CatalogFilters";
import ProductCard from "@/components/store/ProductCard";
import Pagination from "@/components/store/Pagination";

export const metadata = {
  title: "Каталог",
  description: "Каталог свежих фруктов, овощей, ягод, зелени, сухофруктов и орехов с доставкой по Душанбе.",
};

export default async function CatalogPage({ searchParams }) {
  const params = parseCatalogParams(searchParams);
  const supabase = createClient();
  const categories = await getCategories(supabase);
  const tree = categoryTree(categories);
  const { items, total, outOfRange } = await getCatalogProducts(supabase, params, categories);
  const current = categories.find((c) => c.slug === params.category);

  const title = params.q ? `Поиск: «${params.q}»` : current ? current.name : "Каталог";
  const list = params.view === "list";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-4 text-sm text-body/60" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-brand">Главная</Link> / <span>Каталог</span>
        {current && <> / <span className="text-body">{current.name}</span></>}
      </nav>
      <h1 className="font-display text-4xl font-bold text-heading">{title}</h1>
      {current?.description && <p className="mt-2 text-body/70">{current.description}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <CatalogFilters tree={tree} params={params} />

        <section aria-label="Товары">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-body/60" aria-live="polite">
              {total} {plural(total, ["товар", "товара", "товаров"])}
            </p>
            <div className="flex items-center gap-3">
              <SortSelect params={params} />
              <ViewToggle params={params} />
            </div>
          </div>

          {items.length > 0 ? (
            <div className={list ? "grid gap-4" : "grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"}>
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} layout={list ? "list" : "grid"} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="card px-6 py-16 text-center">
              <p className="text-lg font-semibold">
                {outOfRange ? "Такой страницы нет" : "Ничего не найдено"}
              </p>
              <p className="mt-2 text-sm text-body/60">Попробуйте изменить параметры поиска или сбросить фильтры.</p>
              <Link href="/catalog" className="btn-primary mt-6">Сбросить фильтры</Link>
            </div>
          )}

          <Pagination params={params} total={total} />
        </section>
      </div>
    </div>
  );
}
