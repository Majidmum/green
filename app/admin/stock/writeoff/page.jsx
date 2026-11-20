import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import WriteOffForm from "@/components/admin/stock/WriteOffForm";

export const metadata = { title: "Списание" };

export default async function WriteOffPage() {
  const supabase = createClient();
  const [{ data: products, error }, { data: suppliers }] = await Promise.all([
    supabase.from("stock_overview").select("product_id,name,unit,quantity").order("name"),
    supabase.from("suppliers").select("id,name").eq("is_active", true).order("name"),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (
    <>
      <PageHeader title="Списание товара" description="Порча и потери уменьшают прибыль. Списать больше, чем есть на складе, нельзя." />
      <WriteOffForm products={(products ?? []).map((p) => ({ id: p.product_id, name: p.name, unit: p.unit, quantity: p.quantity }))} suppliers={suppliers ?? []} />
    </>
  );
}
