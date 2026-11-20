import Link from "next/link";
import { ArrowRight, Banknote, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Reveal from "@/components/animations/Reveal";
import HeroVisual from "@/components/animations/HeroVisual";
import ProductCard from "@/components/store/ProductCard";
import CategoryIcon from "@/components/store/CategoryIcon";
import ReviewCard from "@/components/store/ReviewCard";
import { formatMoney } from "@/lib/utils/format";

const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-light/70 to-brand-cream">
      <div className={`${wrap} grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20`}>
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-brand shadow-soft">
            <Sparkles size={15} /> Доставка по Душанбе
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-brand-dark sm:text-6xl lg:text-7xl">
            GREEN GARDEN
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-ink/75">
            Свежие фрукты, овощи, ягоды и зелень. Выбирайте онлайн — мы привезём к вам домой или подготовим к самовывозу.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/catalog" className="btn-primary !px-8 !py-4 text-base">
              Перейти в каталог <ArrowRight size={18} />
            </Link>
            <Link href="#hits" className="btn-outline !px-8 !py-4 text-base">
              Смотреть продукты
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
      <h2 className="font-display text-3xl font-bold text-brand-dark sm:text-4xl">{title}</h2>
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
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand transition group-hover:bg-brand group-hover:text-white">
                <CategoryIcon slug={c.slug} className="h-8 w-8" />
              </span>
              <span className="font-semibold text-brand-ink">{c.name}</span>
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
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <Icon size={24} />
              </span>
              <h3 className="font-semibold text-brand-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink/70">{text}</p>
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
