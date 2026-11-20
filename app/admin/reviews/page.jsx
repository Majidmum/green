import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ReviewModeration from "@/components/admin/ReviewModeration";
import SimplePagination from "@/components/ui/SimplePagination";

export const metadata = { title: "Отзывы" };
const PAGE_SIZE = 12;
const TABS = [["pending", "На проверке"], ["approved", "Опубликованные"], ["rejected", "Отклонённые"]];

export default async function AdminReviewsPage({ searchParams }) {
  const status = TABS.some(([k]) => k === searchParams?.status) ? searchParams.status : "pending";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);
  const supabase = createClient();
  const from = (page - 1) * PAGE_SIZE;

  const [{ data: reviews, count, error }, counts] = await Promise.all([
    supabase.from("product_reviews").select("id,product_id,user_id,rating,body,photo_url,status,created_at,products(name)", { count: "exact" }).eq("status", status).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    Promise.all(TABS.map(([k]) => supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("status", k))),
  ]);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  const ids = [...new Set((reviews ?? []).map((r) => r.user_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <PageHeader title="Отзывы" description="Новые и изменённые отзывы попадают сюда на проверку и появляются на сайте только после одобрения." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([k, l], i) => (
          <Link key={k} href={`/admin/reviews?status=${k}`} aria-current={status === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${status === k ? "bg-brand text-white" : "bg-white shadow-soft hover:bg-brand-light"}`}>{l} · {counts[i].count ?? 0}</Link>
        ))}
      </div>
      {!reviews?.length ? <div className="card p-10 text-center text-brand-ink/50">Здесь пока ничего нет</div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reviews.map((r) => <ReviewModeration key={r.id} review={{ ...r, product_name: r.products?.name ?? "Товар", author: who.get(r.user_id) || "Покупатель" }} />)}
        </div>
      )}
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/reviews" query={{ status }} />
    </>
  );
}
