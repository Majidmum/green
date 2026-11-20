import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ReceiveForm from "@/components/admin/stock/ReceiveForm";

export const metadata = { title: "Приход товара" };

export default async function ReceivePage() {
  const supabase = createClient();
  const [{ data: products, error }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("id,name,unit").order("name"),
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name"),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (
    <>
      <PageHeader title="Приход товара" description="Приходный документ с несколькими позициями. Себестоимость пересчитывается как средневзвешенная. Один и тот же документ (поставщик + номер + товар) дважды ввести нельзя." />
      <ReceiveForm products={products ?? []} suppliers={suppliers ?? []} />
    </>
  );
}
