import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/lib/data/catalog";
import {
  BannerStrip, Benefits, CategoryGrid, DeliveryBlock, Hero, ProductSection,
  PromotionsStrip, ReviewsSection,
} from "@/components/store/HomeSections";

export default async function HomePage() {
  const data = await getHomeData(createClient());
  const hasProducts = data.hits.length > 0;

  return (
    <>
      <Hero />
      <BannerStrip banners={data.banners} />
      <CategoryGrid categories={data.categories} />
      {hasProducts ? (
        <>
          <ProductSection id="hits" title="Хиты продаж" href="/catalog?popular=1" products={data.hits} />
          <PromotionsStrip promotions={data.promotions} />
          <ProductSection title="Со скидкой" href="/catalog?sale=1" products={data.offers} />
          <ProductSection title="Новинки" href="/catalog?sort=new" products={data.fresh} />
          <ProductSection title="Сезонные продукты" href="/catalog" products={data.seasonal} />
        </>
      ) : (
        <p id="hits" className="mx-auto max-w-7xl px-4 pt-20 text-center text-brand-ink/60">
          Каталог пополняется — загляните позже.
        </p>
      )}
      <Benefits />
      <ReviewsSection reviews={data.reviews} />
      <DeliveryBlock zones={data.zones} />
    </>
  );
}
