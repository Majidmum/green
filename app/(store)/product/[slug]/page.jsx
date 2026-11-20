import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductBySlug, getProductImages, getRelatedProducts, getReviews } from "@/lib/data/catalog";
import { formatMoney, formatQty, unitLabel } from "@/lib/utils/format";
import ProductGallery from "@/components/store/ProductGallery";
import ProductPurchase from "@/components/store/ProductPurchase";
import ProductCard from "@/components/store/ProductCard";
import ReviewCard from "@/components/store/ReviewCard";
import Stars from "@/components/store/Stars";

const getProduct = cache(async (slug) => getProductBySlug(createClient(), slug));

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Товар не найден" };
  const description = (product.description || `${product.name} — свежие продукты Green Garden с доставкой по Душанбе.`).slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const supabase = createClient();
  const [images, related, reviews] = await Promise.all([
    getProductImages(supabase, product.id),
    getRelatedProducts(supabase, product),
    getReviews(supabase, { productId: product.id, limit: 10 }),
  ]);

  const discount = Number(product.discount_percent) || 0;
  const inStock = Number(product.stock) >= (Number(product.step) || 1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.image_url || undefined,
    category: product.category_name,
    offers: {
      "@type": "Offer",
      priceCurrency: "TJS",
      price: Number(product.price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.rating_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(product.rating_avg), reviewCount: product.rating_count } }
      : {}),
  };

  const facts = [
    ["Категория", <Link key="c" href={`/catalog?category=${product.category_slug}`} className="text-brand hover:underline">{product.category_name}</Link>],
    product.country_of_origin && ["Страна происхождения", product.country_of_origin],
    ["Единица продажи", unitLabel(product.unit)],
    ["В наличии", inStock ? formatQty(product.stock, product.unit) : "Нет в наличии"],
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav className="mb-6 text-sm text-brand-ink/60" aria-label="Хлебные крошки">
        <Link href="/" className="hover:text-brand">Главная</Link> /{" "}
        <Link href="/catalog" className="hover:text-brand">Каталог</Link> /{" "}
        <Link href={`/catalog?category=${product.category_slug}`} className="hover:text-brand">{product.category_name}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={images} fallback={product.image_url} name={product.name} />

        <div>
          <div className="flex flex-wrap gap-2">
            {discount > 0 && <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">−{discount}%</span>}
            {product.is_new && <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Новинка</span>}
            {product.is_seasonal && <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">Сезонный</span>}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold text-brand-dark">{product.name}</h1>
          <div className="mt-3"><Stars value={product.rating_avg} count={product.rating_count} size={18} /></div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-brand-dark">{formatMoney(product.price)}</span>
            <span className="text-brand-ink/60">за {unitLabel(product.unit)}</span>
            {product.old_price && Number(product.old_price) > Number(product.price) && (
              <span className="text-lg text-brand-ink/50 line-through">{formatMoney(product.old_price)}</span>
            )}
          </div>

          {product.description && <p className="mt-5 leading-relaxed text-brand-ink/80">{product.description}</p>}

          <dl className="mt-6 divide-y divide-brand-dark/10 rounded-xl2 bg-white px-5 shadow-soft">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-brand-ink/60">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8"><ProductPurchase product={product} /></div>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="font-display text-3xl font-bold text-brand-dark">Отзывы</h2>
        {reviews.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} showProduct={false} />)}
          </div>
        ) : (
          <p className="mt-4 text-brand-ink/60">Отзывов пока нет. Оставить отзыв могут покупатели, получившие этот товар.</p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-title">
          <h2 id="related-title" className="font-display text-3xl font-bold text-brand-dark">Похожие товары</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
