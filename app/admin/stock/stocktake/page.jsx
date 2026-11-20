import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import StocktakeForm from "@/components/admin/stock/StocktakeForm";

export const metadata = { title: "Инвентаризация" };

export default async function StocktakePage() {
  const { data, error } = await createClient().from("stock_overview").select("product_id,name,unit,quantity").order("name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (
    <>
      <PageHeader title="Инвентаризация" description="Введите фактический остаток. Разница между учётом и фактом фиксируется как недостача или излишек. Если во время подсчёта прошла продажа — операция будет отклонена, чтобы не затереть данные." />
      <StocktakeForm products={(data ?? []).map((p) => ({ id: p.product_id, name: p.name, unit: p.unit, quantity: Number(p.quantity) }))} />
    </>
  );
}
