import Link from "next/link";
import ProductImage from "@/components/store/ProductImage";
import Stars from "@/components/store/Stars";
import AddToCartButton from "@/components/store/AddToCartButton";
import FavoriteButton from "@/components/store/FavoriteButton";
import { formatMoney, unitLabel } from "@/lib/utils/format";

export default function ProductCard({ product, layout = "grid", priority = false }) {
  const list = layout === "list";
  const discount = Number(product.discount_percent) || 0;
  const soldOut = Number(product.stock) < (Number(product.step) || 1);
  const href = `/product/${product.slug}`;

  return (
    <article
      className={`card group relative flex overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${
        list ? "flex-row" : "flex-col"
      }`}
    >
      <Link
        href={href}
        className={`relative block shrink-0 ${list ? "w-36 sm:w-60" : "aspect-square w-full sm:aspect-[4/3]"}`}
        aria-label={product.name}
        tabIndex={-1}
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full transition duration-500 group-hover:scale-105"
          priority={priority}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
          {discount > 0 && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] sm:px-2.5 sm:py-1 sm:text-xs font-bold text-white">−{discount}%</span>
          )}
          {product.is_new && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] sm:px-2.5 sm:py-1 sm:text-xs font-semibold text-white">Новинка</span>
          )}
          {product.is_seasonal && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] sm:px-2.5 sm:py-1 sm:text-xs font-semibold text-white">Сезон</span>
          )}
        </div>
      </Link>

      <FavoriteButton
        productId={product.id}
        className="absolute right-2 top-2 z-10 h-8 w-8 sm:right-3 sm:top-3 sm:h-9 sm:w-9 rounded-full bg-white/90 shadow-soft hover:bg-white"
      />

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <span className="text-xs font-medium text-brand">{product.category_name}</span>
        <Link href={href} className="focus-visible:outline-none">
          <h3 className="text-sm font-semibold sm:text-base leading-snug text-brand-ink hover:text-brand">{product.name}</h3>
        </Link>
        <Stars value={product.rating_avg} count={product.rating_count} />
        {list && product.description && (
          <p className="line-clamp-2 text-sm text-brand-ink/70">{product.description}</p>
        )}
        {product.country_of_origin && (
          <p className="hidden text-xs text-brand-ink/60 sm:block">Происхождение: {product.country_of_origin}</p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-1 sm:gap-3 sm:pt-2">
          <div>
            <div className="text-base font-bold text-brand-dark sm:text-lg">
              {formatMoney(product.price)}
              <span className="ml-1 text-xs font-normal text-brand-ink/60">/ {unitLabel(product.unit)}</span>
            </div>
            {product.old_price && Number(product.old_price) > Number(product.price) && (
              <div className="text-sm text-brand-ink/50 line-through">{formatMoney(product.old_price)}</div>
            )}
          </div>
          {soldOut && <span className="text-xs font-medium text-rose-600">Нет в наличии</span>}
        </div>
        <AddToCartButton product={product} className={`[&_button]:whitespace-nowrap [&_button]:px-3 [&_button]:py-2.5 [&_button]:text-sm sm:[&_button]:px-6 sm:[&_button]:py-3 ${list ? "sm:max-w-[12rem]" : ""}`} />
      </div>
    </article>
  );
}
