import Link from "next/link";
import Logo from "@/components/layout/Logo";
import { Mail, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/data/catalog";

const LINKS = {
  "Покупателям": [
    ["/catalog", "Каталог"],
    ["/delivery", "Доставка и оплата"],
    ["/faq", "Вопросы и ответы"],
    ["/reviews", "Отзывы"],
  ],
  "Компания": [
    ["/about", "О нас"],
    ["/contacts", "Контакты"],
  ],
  "Документы": [
    ["/offer", "Публичная оферта"],
    ["/privacy-policy", "Политика конфиденциальности"],
    ["/terms", "Условия использования"],
  ],
};

export default async function Footer() {
  let info = {};
  try {
    info = (await getSetting(createClient(), "store_info")) ?? {};
  } catch {
    // Подвал не должен ронять страницу, если настройки недоступны
  }

  return (
    <footer className="mt-24 bg-brand-dark text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-white">
            <Logo size={56} variant="light" />
            GREEN GARDEN
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Свежие фрукты, овощи, ягоды и зелень с доставкой по Душанбе.
          </p>
        </div>

        {Object.entries(LINKS).map(([title, items]) => (
          <nav key={title} aria-label={title}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{title}</h2>
            <ul className="space-y-2.5 text-sm">
              {items.map(([href, label]) => (
                <li key={href}><Link href={href} className="transition hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Контакты</h2>
          <ul className="space-y-2.5 text-sm">
            {info.phone && <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0" /><a href={`tel:${info.phone}`} className="hover:text-white">{info.phone}</a></li>}
            {info.email && <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0" /><a href={`mailto:${info.email}`} className="hover:text-white">{info.email}</a></li>}
            {info.address && <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" />{info.address}</li>}
            {!info.phone && !info.email && !info.address && (
              <li className="text-white/50">Контакты будут указаны в ближайшее время</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Green Garden. Все права защищены.
      </div>
    </footer>
  );
}
