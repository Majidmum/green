import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Banknote, Clock, Grid2x2, Leaf, Mail, MapPin, MessageCircle, Phone, ShieldCheck, ShoppingBasket, Smile, Sparkles, Truck,
} from "lucide-react";
import CountUp from "@/components/animations/CountUp";
import Reveal from "@/components/animations/Reveal";
import HeroVisual from "@/components/animations/HeroVisual";
import ProductCard from "@/components/store/ProductCard";
import ProductImage from "@/components/store/ProductImage";
import CategoryIcon from "@/components/store/CategoryIcon";
import ReviewCard from "@/components/store/ReviewCard";

const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

// Для телефонов: вместо плавающих иконок — мозаика из фото и круглый логотип
function HeroCollage() {
  return (
    <div className="relative sm:hidden">
      <div className="grid h-72 grid-cols-2 grid-rows-2 gap-3">
        <div className="relative row-span-2 overflow-hidden rounded-3xl shadow-lift">
          <Image src="/home/peppers.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
        </div>
        <div className="relative overflow-hidden rounded-3xl shadow-lift">
          <Image src="/home/citrus-apples.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
        </div>
        <div className="relative overflow-hidden rounded-3xl shadow-lift">
          <Image src="/home/tomatoes.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FAF8F2] shadow-lift ring-4 ring-surface">
        <Image src="/logo.png" alt="Green Garden" width={96} height={96} className="h-[86%] w-[86%]" />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-tint/70 to-page">
      <div className={`${wrap} grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20`}>
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-brand shadow-soft">
            <Sparkles size={15} /> Свежие фрукты и овощи в Душанбе
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-heading sm:text-6xl lg:text-7xl">
            GREEN GARDEN
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-body/75">
            Свежие фрукты, овощи, ягоды и зелень. Выбирайте онлайн — только отборные продукты на вашем столе каждый день.
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
        <HeroVisual className="hidden sm:block" />
        <HeroCollage />
      </div>
    </section>
  );
}

export function SectionHeading({ title, href, linkLabel = "Смотреть все" }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-8">
      <h2 className="min-w-0 font-display text-2xl font-bold text-heading sm:text-4xl">{title}</h2>
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

const PROMO_FALLBACK_PHOTOS = ["/home/peppers.jpg", "/home/citrus-apples.jpg", "/home/greens.jpg"];

// Три горизонтальные промокарточки с фото: сначала реальные акции из админки, остальные места — быстрые ссылки
export function PromotionsStrip({ promotions }) {
  const cards = promotions.slice(0, 3).map((p, i) => ({
    key: p.id,
    badge: `−${Number(p.discount_value)}${p.discount_type === "percent" ? "%" : " сом."}`,
    title: p.name,
    text: p.description,
    href: "/catalog?sale=1",
    cta: "Смотреть товары",
    image: p.image_url || PROMO_FALLBACK_PHOTOS[i % PROMO_FALLBACK_PHOTOS.length],
  }));
  const extras = [
    { key: "x-sale", badge: "%", title: "Товары со скидкой", text: "Все позиции с действующей скидкой в одном месте.", href: "/catalog?sale=1", cta: "К скидкам", image: "/home/citrus-apples.jpg" },
    { key: "x-new", badge: "NEW", title: "Новинки", text: "Свежие поступления, которые только что появились.", href: "/catalog?sort=new", cta: "Смотреть новинки", image: "/home/fruit-bar.jpg" },
    { key: "x-season", badge: "Сезон", title: "Сезонные продукты", text: "То, что вкуснее всего именно сейчас.", href: "/catalog?seasonal=1", cta: "Выбрать сезонное", image: "/home/tomatoes.jpg" },
  ];
  for (const e of extras) if (cards.length < 3) cards.push(e);
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Специальные предложения" href="/catalog?sale=1" />
        <div className="grid gap-4 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.key} href={c.href} className="group relative flex min-h-[200px] overflow-hidden rounded-2xl bg-brand-dark text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift sm:rounded-xl3">
              <Image src={c.image} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover opacity-90 transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/80 to-brand-dark/10" />
              <div className="relative flex w-3/4 flex-col justify-between p-5 sm:p-6">
                <div>
                  <span className="inline-block rounded-full bg-brand px-3 py-1 font-display text-lg font-bold">{c.badge}</span>
                  <h3 className="mt-3 text-lg font-semibold sm:text-xl">{c.title}</h3>
                  {c.text && <p className="mt-1 line-clamp-2 text-sm text-white/75">{c.text}</p>}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {c.cta} <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// Баннер «Вкус сезона»: три крупных фото (public/season/)
export function SeasonBanner({ products }) {
  if (!products?.length) return null;
  const photos = [
    { src: "/season/pomegranate.jpg", alt: "Спелый гранат" },
    { src: "/season/pineapple.jpg", alt: "Ананас" },
    { src: "/season/citrus.jpg", alt: "Апельсины и мандарины" },
  ];
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-brand-dark text-white shadow-soft sm:rounded-xl3">
          <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[0.8fr_1.5fr] lg:p-10">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-brand">
                <Leaf size={14} /> Сезонные продукты
              </span>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">Вкус сезона</h2>
              <p className="mt-4 max-w-md text-white/75">Свежие фрукты и овощи, которые вкуснее и выгоднее всего именно сейчас. Выбирайте самое спелое и сочное.</p>
              <Link href="/catalog?seasonal=1" className="btn-primary mt-7 !px-8 !py-4 text-base">
                Выбрать сезонное <ArrowRight size={18} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {photos.map((ph, i) => (
                <div
                  key={ph.src}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl shadow-lift sm:rounded-3xl ${i === 1 ? "mt-6 sm:mt-10" : i === 2 ? "mt-2 sm:mt-4" : ""}`}
                >
                  <Image src={ph.src} alt={ph.alt} fill sizes="(max-width: 1024px) 30vw, 20vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
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
  { Icon: Leaf, title: "Свежесть каждый день", text: "Отбираем фрукты, овощи и зелень, чтобы на столе были только свежие продукты." },
  { Icon: ShieldCheck, title: "Проверенное качество", text: "Контролируем качество и работаем с надёжными поставщиками." },
  { Icon: Truck, title: "Быстрая доставка", text: "Привозим заказы по Душанбе или готовим к самовывозу." },
  { Icon: Banknote, title: "Оплата при получении", text: "Платите наличными курьеру или при самовывозе." },
];

export function Benefits() {
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <SectionHeading title="Почему Green Garden" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="card group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-lift sm:p-7">
              <span className="absolute inset-x-0 top-0 h-1 bg-brand/70" />
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand transition group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                <Icon size={26} />
              </span>
              <h3 className="text-base font-semibold text-heading sm:text-lg">{title}</h3>
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

// Запасной набор, если таблица home_services ещё не создана (миграция 7) или пуста
const FALLBACK_SERVICES = [
  { id: "f1", tag: "Онлайн-магазин", title: "Каталог товаров", description: "Фрукты, овощи, ягоды, зелень и орехи с актуальными ценами и остатками.", image_url: "/services/catalog.jpg", link_url: "/catalog" },
  { id: "f4", tag: "Акции", title: "Скидки и предложения", description: "Товары со скидкой и специальные предложения магазина.", image_url: "/services/promo.jpg", link_url: "/catalog?sale=1" },
  { id: "f5", tag: "Личный кабинет", title: "Заказы и адреса", description: "История заказов, статус в реальном времени, адреса и избранное.", image_url: "/services/account.jpg", link_url: "/profile" },
  { id: "f6", tag: "О компании", title: "О Green Garden", description: "Кто мы, как отбираем продукцию и почему нам доверяют.", image_url: "/services/about.jpg", link_url: "/about" },
];

// Карточки «фото + текст»; фото и тексты задаются в админке (Маркетинг → Блоки сервисов)
export function ServicesGrid({ services }) {
  const list = (services?.length ? services : FALLBACK_SERVICES).filter((sv) => sv.link_url !== "/delivery");
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

const STEPS = [
  { n: "01", title: "Выберите продукты", text: "Найдите любимые фрукты и овощи в нашем каталоге и добавьте их в корзину.", image: "/steps/step-1.jpg" },
  { n: "02", title: "Оформите заказ", text: "Укажите адрес, выберите удобный способ получения и подтвердите заказ.", image: "/steps/step-2.jpg" },
  { n: "03", title: "Получите свежесть", text: "Получите заказ с доставкой или заберите самостоятельно в магазине.", image: "/steps/step-3.jpg" },
];

// «3 шага»: фото не изменяются, текст и затемнение делаются стилями поверх снимка
export function HowItWorks() {
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className="grid items-center gap-8 lg:grid-cols-[0.75fr_1.75fr] lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-tint px-3 py-1 text-sm font-medium text-brand">
              <Sparkles size={14} /> Как это работает
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl lg:text-[2.6rem]">
              Ваши любимые продукты — всего за 3 шага
            </h2>
            <p className="mt-4 text-body/70">
              Выберите товары в каталоге, оформите заказ и получите свежие фрукты и овощи с доставкой или самовывозом.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {STEPS.map((st) => (
              <div key={st.n} className="card overflow-hidden p-2 transition hover:-translate-y-1 hover:shadow-lift">
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl sm:aspect-[4/5]">
                  <Image src={st.image} alt={st.title} fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-brand-dark via-brand-dark/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <span className="font-display text-lg font-bold text-brand">{st.n}</span>
                    <h3 className="mt-1 text-xl font-bold leading-tight">{st.title}</h3>
                    <p className="mt-2 text-sm leading-snug text-white/85">{st.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/catalog" className="btn-primary !px-10 !py-4 text-base">
            Перейти в каталог <ArrowRight size={18} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// Цифры берутся из базы (функция public_stats): товары, категории, зоны доставки, клиенты с доставленными заказами
export function StatsBand({ stats }) {
  const items = [
    { Icon: ShoppingBasket, value: Number(stats?.products ?? 0), label: "товаров в каталоге" },
    { Icon: Grid2x2, value: Number(stats?.categories ?? 0), label: "категорий" },
    { Icon: Smile, value: Number(stats?.customers ?? 0), label: "довольных клиентов" },
  ].filter((i) => i.value > 0);
  if (!items.length) return null;
  return (
    <section className={`${wrap} pt-20`}>
      <Reveal>
        <div className={`grid grid-cols-2 gap-3 sm:gap-5 ${items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : ""}`}>
          {items.map(({ Icon, value, label }) => (
            <div key={label} className="relative overflow-hidden rounded-2xl bg-brand-dark p-5 text-white shadow-soft sm:rounded-xl3 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-brand sm:h-12 sm:w-12">
                <Icon size={22} />
              </span>
              <p className="mt-5 font-display text-4xl font-bold leading-none text-white sm:text-5xl">
                <CountUp value={value} />
              </p>
              <p className="mt-2 text-sm text-white/75 sm:text-base">{label}</p>
              <Icon aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 text-white/[0.04]" strokeWidth={1.2} />
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
