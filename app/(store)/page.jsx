import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/lib/data/catalog";
import {
  BannerStrip, Benefits, CategoryGrid, ContactsBlock, DeliveryBlock, Hero,
  PromotionsStrip, ReviewsSection, ServicesGrid, StatsBand,
} from "@/components/store/HomeSections";

export default async function HomePage() {
  const data = await getHomeData(createClient());

  return (
    <>
      <Hero />
      <BannerStrip banners={data.banners} />
      <ServicesGrid services={data.services} />
      <CategoryGrid categories={data.categories} />
      <StatsBand products={data.productCount} categories={data.categories.filter((c) => !c.parent_id).length} zones={data.zones.length} />
      <PromotionsStrip promotions={data.promotions} />
      <Benefits />
      <ReviewsSection reviews={data.reviews} />
      <DeliveryBlock zones={data.zones} />
      <ContactsBlock info={data.info} />
    </>
  );
}
