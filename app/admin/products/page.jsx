import Link from "next/link";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/utils/catalog-params";
import { formatMoney, formatQty, unitLabel } from "@/lib/utils/format";
import PageHeader from "@/components/admin/PageHeader";
import SimplePagination from "@/components/ui/SimplePagination";

export const metadata = { title: "Товары" };
const PAGE_SIZE = 20;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function AdminProductsPage({ searchParams }) {
  const q = String(searchParams?.q ?? "").trim().slice(0, 80);
  const cat = UUID.test(searchParams?.category ?? "") ? searchParams.category : "";
  const status = ["active", "hidden"].includes(searchParams?.status) ? searchParams.status : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const supabase = createClient();

  let query = supabase
    .from("products")
    .select("id,name,slug,price,unit,is_active,min_stock,categories(name),inventory(quantity),product_images(url,is_primary,sort_order)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  if (cat) query = query.eq("category_id", cat);
  if (status) query = query.eq("is_active", status === "active");
  const from = (page - 1) * PAGE_SIZE;

  const [{ data: products, count, error }, { data: cats }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("categories").select("id,name").order("name"),
  ]);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  return (
    <>
      <PageHeader title="Товары" description="Цена, фото, шаг количества и закупочная цена. Остаток меняется только приходом, списанием и инвентаризацией.">
        <Link href="/admin/products/new" className="btn-primary !py-2.5"><Plus size={16} /> Новый товар</Link>
      </PageHeader>

      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body/40" />
          <input name="q" defaultValue={q} className="input !pl-9" placeholder="Название товара" aria-label="Поиск" />
        </div>
        <select name="category" defaultValue={cat} className="input" aria-label="Категория">
          <option value="">Все категории</option>
          {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status} className="input" aria-label="Статус">
          <option value="">Любой статус</option><option value="active">Активные</option><option value="hidden">Скрытые</option>
        </select>
        <div className="flex gap-2 sm:col-span-4"><button className="btn-primary !py-2.5">Применить</button><Link href="/admin/products" className="btn-outline !py-2.5">Сбросить</Link></div>
      </form>

      <div className="card overflow-x-auto">
        <table className="rt w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50">
            <tr><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Категория</th><th className="px-4 py-3">Цена</th><th className="px-4 py-3">Остаток</th><th className="px-4 py-3">Статус</th></tr>
          </thead>
          <tbody className="divide-y divide-heading/5">
            {!products?.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-body/50">Товаров не найдено</td></tr>}
            {(products ?? []).map((p) => {
              const img = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
              const qty = Number(p.inventory?.quantity ?? 0);
              const low = qty <= 0 ? "zero" : qty <= Number(p.min_stock) ? "low" : "ok";
              return (
                <tr key={p.id} className="hover:bg-tint/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold text-brand hover:underline">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-tint">{img && <Image src={img.url} alt="" fill sizes="40px" className="object-cover" unoptimized />}</span>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-body/70">{p.categories?.name}</td>
                  <td className="px-4 py-3">{formatMoney(p.price)} / {unitLabel(p.unit)}</td>
                  <td className="px-4 py-3"><span className={low === "zero" ? "font-semibold text-rose-600" : low === "low" ? "font-semibold text-amber-600" : ""}>{formatQty(qty, p.unit)}</span></td>
                  <td className="px-4 py-3">{p.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Активен</span> : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Скрыт</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/products" query={{ q, category: cat, status }} />
    </>
  );
}
