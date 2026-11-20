import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const { data: cats, error } = await createClient().from("categories").select("id,name").order("name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (
    <>
      <PageHeader title="Новый товар" description="Сначала создайте карточку, затем добавьте фото и оформите приход товара на склад." />
      <ProductForm categories={(cats ?? []).map((c) => ({ id: c.id, label: c.name }))} />
    </>
  );
}
