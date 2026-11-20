import { createClient } from "@/lib/supabase/server";
import { getReviews } from "@/lib/data/catalog";
import ReviewCard from "@/components/store/ReviewCard";

export const metadata = {
  title: "Отзывы покупателей",
  description: "Отзывы покупателей о товарах Green Garden.",
};

export default async function ReviewsPage() {
  const reviews = await getReviews(createClient(), { limit: 60 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-heading">Отзывы покупателей</h1>
      <p className="mt-2 max-w-2xl text-body/70">
        Отзывы оставляют только те, кто получил заказ. Каждый отзыв проходит модерацию.
      </p>
      {reviews.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      ) : (
        <p className="mt-10 text-body/60">Пока нет опубликованных отзывов.</p>
      )}
    </div>
  );
}
