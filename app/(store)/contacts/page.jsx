import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/data/catalog";

export const metadata = {
  title: "Контакты",
  description: "Контакты Green Garden: телефон, адрес, время работы.",
};

export default async function ContactsPage() {
  const info = (await getSetting(createClient(), "store_info")) ?? {};
  const waNumber = String(info.whatsapp || "").replace(/\D/g, "");
  const tg = String(info.telegram || "").replace(/^@/, "");

  const rows = [
    info.phone && { Icon: Phone, label: "Телефон", node: <a href={`tel:${info.phone}`} className="text-brand hover:underline">{info.phone}</a> },
    waNumber && { Icon: MessageCircle, label: "WhatsApp", node: <a href={`https://wa.me/${waNumber}`} className="text-brand hover:underline" rel="noopener noreferrer" target="_blank">{info.whatsapp}</a> },
    tg && /^[A-Za-z0-9_]{3,64}$/.test(tg) && { Icon: MessageCircle, label: "Telegram", node: <a href={`https://t.me/${tg}`} className="text-brand hover:underline" rel="noopener noreferrer" target="_blank">@{tg}</a> },
    info.email && { Icon: Mail, label: "Email", node: <a href={`mailto:${info.email}`} className="text-brand hover:underline">{info.email}</a> },
    info.address && { Icon: MapPin, label: "Адрес", node: info.address },
    info.working_hours && { Icon: Clock, label: "Время работы", node: info.working_hours },
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-heading">Контакты</h1>
      {rows.length > 0 ? (
        <ul className="card mt-8 divide-y divide-heading/10">
          {rows.map(({ Icon, label, node }) => (
            <li key={label} className="flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint text-brand"><Icon size={20} /></span>
              <div>
                <p className="text-sm text-body/60">{label}</p>
                <p className="font-medium">{node}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-body/60">Контактная информация скоро появится на этой странице.</p>
      )}
    </div>
  );
}
