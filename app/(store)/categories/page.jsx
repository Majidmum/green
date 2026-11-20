import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryTree, getCategories } from "@/lib/data/catalog";
import CategoryIcon from "@/components/store/CategoryIcon";

export const metadata = {
  title: "Категории",
  description: "Все категории Green Garden: фрукты, овощи, ягоды, зелень, сухофрукты, орехи.",
};

export default async function CategoriesPage() {
  const tree = categoryTree(await getCategories(createClient()));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-heading">Категории</h1>
      <p className="mt-2 text-body/70">Выберите раздел каталога.</p>

      {tree.length === 0 ? (
        <p className="mt-10 text-body/60">Категории пока не добавлены.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((c) => (
            <div key={c.id} className="card p-6">
              <Link href={`/catalog?category=${c.slug}`} className="group flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tint text-brand transition group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon slug={c.slug} className="h-7 w-7" />
                </span>
                <span>
                  <span className="block text-lg font-semibold group-hover:text-brand">{c.name}</span>
                  {c.description && <span className="mt-0.5 block text-sm text-body/60">{c.description}</span>}
                </span>
              </Link>
              {c.children.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.children.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/catalog?category=${ch.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1.5 text-sm font-medium text-heading transition hover:bg-brand hover:text-white"
                    >
                      <CategoryIcon slug={ch.slug} className="h-4 w-4" /> {ch.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
