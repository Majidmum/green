import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeliveryZones, getSetting } from "@/lib/data/catalog";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Оформление заказа", robots: { index: false } };

export default async function CheckoutPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const [{ data: profile }, { data: addresses, error }, zones, slots] = await Promise.all([
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("addresses")
      .select("id,label,city,street,house,apartment,entrance,floor,note")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    getDeliveryZones(supabase),
    getSetting(supabase, "time_slots"),
  ]);
  if (error) throw new Error(`Supabase: ${error.message}`);

  // «Сегодня» по времени Душанбе (формат YYYY-MM-DD)
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dushanbe" }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold text-heading">Оформление заказа</h1>
      <CheckoutForm
        user={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
        addresses={addresses ?? []}
        zones={zones}
        slots={Array.isArray(slots) ? slots : []}
        today={today}
      />
    </div>
  );
}
