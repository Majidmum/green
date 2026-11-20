import { createClient } from "@supabase/supabase-js";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";

const STATIC = ["", "/catalog", "/categories", "/reviews", "/about", "/contacts", "/faq", "/delivery", "/offer", "/privacy-policy", "/terms"];

export default async function sitemap() {
  const entries = STATIC.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" }));

  try {
    // Анонимный клиент без cookies: sitemap строится только из публичных данных
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("product_catalog").select("slug,created_at").limit(5000),
      supabase.from("categories").select("slug").limit(500),
    ]);
    for (const p of products ?? [])
      entries.push({ url: `${siteUrl}/product/${p.slug}`, lastModified: p.created_at, changeFrequency: "daily" });
    for (const c of categories ?? [])
      entries.push({ url: `${siteUrl}/catalog?category=${c.slug}`, changeFrequency: "weekly" });
  } catch {
    // Без доступа к базе отдаём статическую часть
  }
  return entries;
}
