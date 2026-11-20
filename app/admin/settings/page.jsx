import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import SettingsEditor from "@/components/admin/SettingsEditor";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const { data, error } = await createClient().from("store_settings").select("key,value");
  if (error) throw new Error(`Supabase: ${error.message}`);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return (
    <>
      <PageHeader title="Настройки и страницы" description="Контакты, интервалы доставки и юридические тексты. Реквизиты и условия не придуманы за вас — заполните их и согласуйте с юристом." />
      <SettingsEditor
        storeInfo={map.store_info ?? {}}
        slots={Array.isArray(map.time_slots) ? map.time_slots : []}
        pages={{ offer: map["page:offer"], "privacy-policy": map["page:privacy-policy"], terms: map["page:terms"], delivery: map["page:delivery"] }}
      />
    </>
  );
}
