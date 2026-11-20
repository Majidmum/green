import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES } from "@/lib/admin/resources";
import PageHeader from "@/components/admin/PageHeader";
import ResourceManager from "@/components/admin/ResourceManager";

export async function generateMetadata({ params }) {
  return { title: RESOURCES[params.resource]?.title ?? "Раздел" };
}

const DESCRIPTIONS = {
  expenses: "Расходы уменьшают чистую прибыль. Удалить расход нельзя — только аннулировать: так финансовая история остаётся честной.",
  promo_codes: "Скидка применяется к сумме товаров. Все проверки (срок, лимиты, минимальная сумма) выполняет сервер при оформлении заказа.",
  promotions: "Акция меняет цену на витрине автоматически на время действия: на товар, на категорию или на весь ассортимент.",
  delivery_zones: "Стоимость доставки, порог бесплатной доставки и минимальная сумма заказа считаются на сервере по выбранному району.",
};

export default async function ResourcePage({ params }) {
  const res = RESOURCES[params.resource];
  if (!res) notFound();
  const supabase = createClient();

  let q = supabase.from(res.table).select("*");
  for (const [col, asc] of res.orderBy) q = q.order(col, { ascending: asc });
  const needsLookups = res.fields.some((f) => f.optionsFrom) || res.columns.some((c) => c.format?.startsWith("lookup"));

  const [{ data: rows, error }, cats, prods] = await Promise.all([
    q.limit(500),
    needsLookups ? supabase.from("categories").select("id,name").order("name") : { data: [] },
    needsLookups && params.resource === "promotions" ? supabase.from("products").select("id,name").order("name") : { data: [] },
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);

  return (
    <>
      <PageHeader title={res.title} description={DESCRIPTIONS[params.resource]} />
      <ResourceManager
        resourceKey={params.resource}
        rows={rows ?? []}
        lookups={{
          categories: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          products: (prods.data ?? []).map((p) => ({ value: p.id, label: p.name })),
        }}
      />
    </>
  );
}
