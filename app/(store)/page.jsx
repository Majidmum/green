import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/lib/data/catalog";
import {
  BannerStrip, Benefits, CategoryGrid, ContactsBlock, DeliveryBlock, Hero, ProductSection,
  PromotionsStrip, ReviewsSection, ServicesGrid, StatsBand,
} from "@/components/store/HomeSections";

export default async function HomePage() {
  const data = await getHomeData(createClient());
  const hasProducts = data.hits.length > 0;

  return (
    <>
      <Hero />
      <BannerStrip banners={data.banners} />
      <ServicesGrid />
      <CategoryGrid categories={data.categories} />
      <StatsBand products={data.productCount} categories={data.categories.filter((c) => !c.parent_id).length} zones={data.zones.length} />
      {hasProducts ? (
        <>
          <PromotionsStrip promotions={data.promotions} />
          <ProductSection title="Акции: товары со скидкой" href="/catalog?sale=1" products={data.offers} />
          <ProductSection id="hits" title="Хиты продаж" href="/catalog?popular=1" products={data.hits} />
          <ProductSection title="Новинки" href="/catalog?sort=new" products={data.fresh} />
          <ProductSection title="Сезонные продукты" href="/catalog" products={data.seasonal} />
        </>
      ) : (
        <p id="hits" className="mx-auto max-w-7xl px-4 pt-20 text-center text-body/60">
          Каталог пополняется — загляните позже.
        </p>
      )}
      <Benefits />
      <ReviewsSection reviews={data.reviews} />
      <DeliveryBlock zones={data.zones} />
      <ContactsBlock info={data.info} />
    </>
  );
}
