import { createClient } from "@/lib/supabase/server";
import { getDeliveryZones } from "@/lib/data/catalog";
import LegalPage, { getLegalPage } from "@/components/store/LegalPage";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Доставка и оплата",
  description: "Условия доставки по Душанбе, самовывоз и способы оплаты Green Garden.",
};

export default async function DeliveryPage() {
  const [page, zones] = await Promise.all([getLegalPage("delivery"), getDeliveryZones(createClient())]);

  return (
    <LegalPage page={page}>
      {zones.length > 0 && (
        <section className="mt-10" aria-labelledby="zones-title">
          <h2 id="zones-title" className="font-display text-2xl font-bold text-brand-dark">Зоны и стоимость доставки</h2>
          <div className="mt-4 overflow-x-auto rounded-xl2 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light text-brand-dark">
                <tr>
                  <th className="px-4 py-3 font-semibold">Район</th>
                  <th className="px-4 py-3 font-semibold">Стоимость</th>
                  <th className="px-4 py-3 font-semibold">Бесплатно от</th>
                  <th className="px-4 py-3 font-semibold">Мин. заказ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/10">
                {zones.map((z) => (
                  <tr key={z.id}>
                    <td className="px-4 py-3 font-medium">{z.name}</td>
                    <td className="px-4 py-3">{Number(z.delivery_fee) > 0 ? formatMoney(z.delivery_fee) : "Бесплатно"}</td>
                    <td className="px-4 py-3">{z.free_delivery_from ? formatMoney(z.free_delivery_from) : "—"}</td>
                    <td className="px-4 py-3">{Number(z.min_order_total) > 0 ? formatMoney(z.min_order_total) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-brand-dark">Способы оплаты</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-brand-ink/85">
          <li>Наличными курьеру при доставке.</li>
          <li>При самовывозе — оплата на месте.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
