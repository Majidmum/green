import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CATALOG_FIELDS } from "@/lib/data/catalog";
import ProductCard from "@/components/store/ProductCard";

export const metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/favorites");

  const { data: favs, error } = await supabase.from("favorites").select("product_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const ids = (favs ?? []).map((f) => f.product_id);

  let products = [];
  if (ids.length) {
    const { data, error: e2 } = await supabase.from("product_catalog").select(CATALOG_FIELDS).in("id", ids);
    if (e2) throw new Error(`Supabase: ${e2.message}`);
    const order = new Map(ids.map((id, i) => [id, i]));
    products = (data ?? []).sort((a, b) => order.get(a.id) - order.get(b.id));
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-4xl font-bold text-brand-dark">Избранное</h1>
      {products.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Heart size={40} className="text-brand/50" />
          <p className="text-brand-ink/70">В избранном пока пусто. Нажимайте на сердечко у товара, чтобы вернуться к нему позже.</p>
          <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
