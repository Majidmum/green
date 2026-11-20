import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ProductForm from "@/components/admin/ProductForm";
import ProductImages from "@/components/admin/ProductImages";
import { formatMoney, formatQty } from "@/lib/utils/format";

export const metadata = { title: "Товар" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params, searchParams }) {
  if (!UUID.test(params.id)) notFound();
  const supabase = createClient();
  const [{ data: product, error }, { data: cats }, { data: inv }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("inventory").select("quantity,avg_cost").eq("product_id", params.id).maybeSingle(),
    supabase.from("product_images").select("id,url,alt,is_primary,sort_order").eq("product_id", params.id).order("is_primary", { ascending: false }).order("sort_order"),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} description={`Остаток: ${formatQty(inv?.quantity ?? 0, product.unit)} · средняя себестоимость: ${formatMoney(inv?.avg_cost ?? 0)}`}>
        <Link href={`/product/${product.slug}`} className="btn-outline !py-2.5" target="_blank">Открыть на сайте</Link>
        <Link href={`/admin/stock/journal?product=${product.id}`} className="btn-outline !py-2.5">Движения по складу</Link>
      </PageHeader>
      {searchParams?.created && <p className="mb-4 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark" role="status">Товар создан. Теперь добавьте фото, а остаток — через «Приход товара».</p>}
      <div className="space-y-5">
        <ProductForm product={product} cost={inv?.avg_cost ?? ""} categories={(cats ?? []).map((c) => ({ id: c.id, label: c.name }))} />
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-brand-dark">Фотографии</h2>
          <ProductImages productId={product.id} images={images ?? []} />
        </section>
      </div>
    </>
  );
}
