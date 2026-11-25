import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/lib/data/catalog";
import {
  BannerStrip, Benefits, CategoryGrid, ContactsBlock, Hero,
  HowItWorks, PromotionsStrip, ReviewsSection, SeasonBanner, ServicesGrid, StatsBand,
} from "@/components/store/HomeSections";

export default async function HomePage() {
  const data = await getHomeData(createClient());

  return (
    <>
      <Hero />
      <BannerStrip banners={data.banners} />
      <ServicesGrid services={data.services} />
      <CategoryGrid categories={data.categories} />
      <HowItWorks />
      <StatsBand stats={data.stats} />
      <PromotionsStrip promotions={data.promotions} />
      <SeasonBanner products={data.seasonal} />
      <Benefits />
      <ReviewsSection reviews={data.reviews} />
      <ContactsBlock info={data.info} />
    </>
  );
}
