import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MyReviewCard from "@/components/account/MyReviewCard";

export const metadata = { title: "Мои отзывы", robots: { index: false } };

export default async function MyReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-reviews");

  const { data: reviews, error } = await supabase
    .from("product_reviews").select("id,product_id,rating,body,photo_url,status,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase: ${error.message}`);

  const ids = (reviews ?? []).map((r) => r.product_id);
  const { data: prods } = ids.length ? await supabase.from("products").select("id,name,slug").in("id", ids) : { data: [] };
  const byId = new Map((prods ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h1 className="mb-2 font-display text-4xl font-bold text-brand-dark">Мои отзывы</h1>
      <p className="mb-6 text-sm text-brand-ink/60">Отзыв можно оставить на товар из доставленного заказа — откройте заказ и нажмите «Оставить отзыв».</p>
      {!reviews?.length ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <MessageSquare size={40} className="text-brand/50" />
          <p className="text-brand-ink/70">Вы ещё не оставляли отзывов.</p>
          <Link href="/orders" className="btn-primary">К моим заказам</Link>
        </div>
      ) : (
        <div className="space-y-4">{reviews.map((r) => <MyReviewCard key={r.id} review={r} product={byId.get(r.product_id)} />)}</div>
      )}
    </div>
  );
}
