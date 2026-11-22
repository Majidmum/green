import Link from "next/link";
import {
  ArrowRight, Banknote, Clock, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles, Truck,
} from "lucide-react";
import Reveal from "@/components/animations/Reveal";
import HeroVisual from "@/components/animations/HeroVisual";
import ProductCard from "@/components/store/ProductCard";
import ProductImage from "@/components/store/ProductImage";
import CategoryIcon from "@/components/store/CategoryIcon";
import ReviewCard from "@/components/store/ReviewCard";
import { formatMoney } from "@/lib/utils/format";

const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-tint/70 to-page">
      <div className={`${wrap} grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20`}>
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-brand shadow-soft">
            <Sparkles size={15} /> Доставка по Душанбе
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-heading sm:text-6xl lg:text-7xl">
            GREEN GARDEN
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-body/75">
            Свежие фрукты, овощи, ягоды и зелень. Выбирайте онлайн — мы привезём к вам домой или подготовим к самовывозу.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/catalog" className="btn-primary !px-8 !py-4 text-base">
              Перейти в каталог <ArrowRight size={18} />
            </Link>
            <Link href="/catalog?sale=1" className="btn-outline !px-8 !py-4 text-base">
              Акции и скидки
            </Link>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

export function SectionHeading({ title, href, linkLabel = "Смотреть все" }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl font-bold text-heading sm:text-4xl">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
          {linkLabel} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function ProductSection({ id, title, href, products }) {
  if (!products.length) return null;
  return (
    <section id={id} className={`${wrap} scroll-mt-24 pt-20`}>
      <Reveal>
        <SectionHeading title={title} href={href} />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function CategoryGrid({ categories }) {
  const roots = categories.filter((c) => !c.parent_id);
  if (!roots.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Популярные категории" href="/categories" linkLabel="Все категории" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {roots.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className="card group flex flex-col items-center gap-3 p-6 text-center transition hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-brand transition group-hover:bg-brand group-hover:text-white">
                <CategoryIcon slug={c.slug} className="h-8 w-8" />
              </span>
              <span className="font-semibold text-body">{c.name}</span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function PromotionsStrip({ promotions }) {
  if (!promotions.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Специальные предложения" href="/catalog?sale=1" />
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.map((p) => (
            <div key={p.id} className="flex items-center gap-5 rounded-xl2 bg-brand-dark p-6 text-white">
              <span className="font-display text-4xl font-bold text-brand">
                −{Number(p.discount_value)}{p.discount_type === "percent" ? "%" : " сом."}
              </span>
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                {p.description && <p className="mt-1 text-sm text-white/70">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function BannerStrip({ banners }) {
  if (!banners.length) return null;
  return (
    <section className={`${wrap} pt-10`}>
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => {
          const inner = (
            <div
              className="relative flex min-h-[160px] flex-col justify-end overflow-hidden rounded-xl2 bg-brand-dark bg-cover bg-center p-6 text-white"
              style={b.image_url ? { backgroundImage: `linear-gradient(to top, rgba(18,61,42,.85), rgba(18,61,42,.15)), url(${b.image_url})` } : undefined}
            >
              <p className="font-display text-2xl font-bold">{b.title}</p>
              {b.subtitle && <p className="mt-1 text-sm text-white/80">{b.subtitle}</p>}
            </div>
          );
          return b.link_url && b.link_url.startsWith("/") ? (
            <Link key={b.id} href={b.link_url}>{inner}</Link>
          ) : (
            <div key={b.id}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}

const BENEFITS = [
  { Icon: ShieldCheck, title: "Высокое качество", text: "Отбираем свежие фрукты, овощи и зелень для вашего стола." },
  { Icon: Truck, title: "Быстрая доставка", text: "Привозим заказы по Душанбе или готовим к самовывозу." },
  { Icon: Banknote, title: "Оплата при получении", text: "Платите наличными курьеру или при самовывозе." },
  { Icon: Sparkles, title: "Удобный заказ", text: "Выбирайте товар по весу или поштучно и следите за статусом заказа." },
];

export function Benefits() {
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Почему Green Garden" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="card p-6">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand">
                <Icon size={24} />
              </span>
              <h3 className="font-semibold text-body">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body/70">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ReviewsSection({ reviews }) {
  if (!reviews.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Отзывы покупателей" href="/reviews" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function DeliveryBlock({ zones }) {
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="grid gap-8 rounded-xl3 bg-brand-dark p-8 text-white md:grid-cols-[1fr_1.2fr] md:p-12">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Доставка и оплата</h2>
            <p className="mt-4 text-white/75">
              Выберите доставку курьером или самовывоз при оформлении заказа. Оплата — наличными при получении.
            </p>
            <Link href="/delivery" className="btn mt-6 bg-brand text-white hover:bg-brand/90">
              Подробные условия <ArrowRight size={16} />
            </Link>
          </div>
          {zones.length > 0 && (
            <ul className="divide-y divide-white/10 rounded-xl2 bg-white/5">
              {zones.map((z) => (
                <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <span className="font-semibold">{z.name}</span>
                  <span className="text-sm text-white/75">
                    {Number(z.delivery_fee) > 0 ? formatMoney(z.delivery_fee) : "бесплатно"}
                    {z.free_delivery_from && Number(z.delivery_fee) > 0
                      ? `, бесплатно от ${formatMoney(z.free_delivery_from)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </section>
  );
}

// ---- Блоки в стиле «компания и сервисы» ----

// Запасной набор, если таблица home_services ещё не создана (миграция 7) или пуста
const FALLBACK_SERVICES = [
  { id: "f1", tag: "Онлайн-магазин", title: "Каталог товаров", description: "Фрукты, овощи, ягоды, зелень и орехи с актуальными ценами и остатками.", image_url: "/services/catalog.jpg", link_url: "/catalog" },
  { id: "f2", tag: "Доставка", title: "Доставка по Душанбе", description: "Курьер привезёт заказ по вашему адресу. Зоны и стоимость — в условиях доставки.", image_url: "/services/delivery.jpg", link_url: "/delivery" },
  { id: "f3", tag: "Самовывоз", title: "Заберите сами", description: "Оформите заказ онлайн и заберите его в удобное время.", image_url: "/services/pickup.jpg", link_url: "/delivery" },
  { id: "f4", tag: "Акции", title: "Скидки и предложения", description: "Товары со скидкой и специальные предложения магазина.", image_url: "/services/promo.jpg", link_url: "/catalog?sale=1" },
  { id: "f5", tag: "Личный кабинет", title: "Заказы и адреса", description: "История заказов, статус в реальном времени, адреса и избранное.", image_url: "/services/account.jpg", link_url: "/profile" },
  { id: "f6", tag: "О компании", title: "О Green Garden", description: "Кто мы, как отбираем продукцию и почему нам доверяют.", image_url: "/services/about.jpg", link_url: "/about" },
];

// Карточки «фото + текст»; фото и тексты задаются в админке (Маркетинг → Блоки сервисов)
export function ServicesGrid({ services }) {
  const list = services?.length ? services : FALLBACK_SERVICES;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-heading sm:text-4xl">Green Garden — все сервисы в одном месте</h2>
          <p className="mt-3 text-body/70">Магазин, доставка, самовывоз, акции и личный кабинет — выберите то, что нужно сегодня.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {list.map((sv) => {
            const inner = (
              <>
                <ProductImage src={sv.image_url} alt={sv.title} className="aspect-video w-full transition duration-500 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 50vw, 33vw" />
                <div className="flex flex-1 flex-col p-4 sm:p-6">
                  {sv.tag && <span className="text-[10px] font-semibold uppercase tracking-wider text-brand sm:text-xs">{sv.tag}</span>}
                  <h3 className="mt-1 text-base font-semibold text-heading sm:text-xl">{sv.title}</h3>
                  {sv.description && <p className="mt-2 hidden flex-1 text-sm leading-relaxed text-body/70 sm:block">{sv.description}</p>}
                  {sv.link_url && (
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand sm:mt-4">
                      Подробнее <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
              </>
            );
            const cls = "card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift";
            return sv.link_url && sv.link_url.startsWith("/") ? (
              <Link key={sv.id} href={sv.link_url} className={cls}>{inner}</Link>
            ) : (
              <div key={sv.id} className={cls}>{inner}</div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

// Цифры берутся из базы: число товаров, категорий и зон доставки
export function StatsBand({ products, categories, zones }) {
  const items = [
    { value: products, label: "товаров в каталоге" },
    { value: categories, label: "категорий" },
    { value: zones, label: "зон доставки" },
  ].filter((i) => i.value > 0);
  if (!items.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="grid gap-6 rounded-xl3 bg-brand-dark p-8 text-white sm:grid-cols-3 md:p-12">
          {items.map((i) => (
            <div key={i.label} className="text-center sm:text-left">
              <p className="font-display text-5xl font-bold text-brand sm:text-6xl">{i.value}</p>
              <p className="mt-2 text-white/80">{i.label}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ContactsBlock({ info }) {
  const waNumber = String(info.whatsapp || "").replace(/\D/g, "");
  const tg = String(info.telegram || "").replace(/^@/, "");
  const rows = [
    info.phone && { Icon: Phone, label: "Телефон", node: <a href={`tel:${info.phone}`} className="hover:text-brand">{info.phone}</a> },
    info.email && { Icon: Mail, label: "Email", node: <a href={`mailto:${info.email}`} className="hover:text-brand">{info.email}</a> },
    info.address && { Icon: MapPin, label: "Адрес", node: info.address },
    info.working_hours && { Icon: Clock, label: "Время работы", node: info.working_hours },
  ].filter(Boolean);
  const socials = [
    waNumber && { label: "WhatsApp", href: `https://wa.me/${waNumber}` },
    tg && /^[A-Za-z0-9_]{3,64}$/.test(tg) && { label: "Telegram", href: `https://t.me/${tg}` },
  ].filter(Boolean);
  if (!rows.length && !socials.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="card grid gap-8 p-8 md:grid-cols-[1fr_1.4fr] md:p-12">
          <div>
            <h2 className="font-display text-3xl font-bold text-heading sm:text-4xl">Контакты</h2>
            <p className="mt-3 text-body/70">Свяжитесь с нами — ответим на вопросы о заказе и доставке.</p>
            {socials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn-outline !py-2.5">
                    <MessageCircle size={16} /> {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {rows.map(({ Icon, label, node }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint text-brand"><Icon size={20} /></span>
                <div>
                  <p className="text-sm text-body/60">{label}</p>
                  <p className="font-medium text-heading">{node}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
