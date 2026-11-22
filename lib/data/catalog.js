import { PAGE_SIZE, escapeLike } from "@/lib/utils/catalog-params";

// Публичные поля витрины (view product_catalog): закупочных цен здесь нет.
export const CATALOG_FIELDS =
  "id,name,slug,description,category_id,category_name,category_slug,unit,step," +
  "country_of_origin,is_featured,is_new,is_seasonal,sales_count,rating_avg,rating_count," +
  "created_at,price,base_price,old_price,discount_percent,stock,image_url";

function check(error) {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export async function getCategories(supabase) {
  const { data, error } = await supabase
    .from("categories")
    .select("id,parent_id,name,slug,description,image_url,sort_order")
    .order("sort_order")
    .order("name");
  check(error);
  return data ?? [];
}

// Дерево: корневые категории с массивом children
export function categoryTree(categories) {
  const byParent = new Map();
  for (const c of categories) {
    const key = c.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }
  const roots = (byParent.get("root") ?? []).map((c) => ({
    ...c,
    children: byParent.get(c.id) ?? [],
  }));
  // Подкатегории, чей родитель неактивен/скрыт, показываем как корневые
  const known = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    if (c.parent_id && !known.has(c.parent_id)) roots.push({ ...c, children: [] });
  }
  return roots;
}

// slug категории + slug всех её подкатегорий
export function categorySlugsWithChildren(categories, slug) {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [slug];
  return [cat.slug, ...categories.filter((c) => c.parent_id === cat.id).map((c) => c.slug)];
}

export async function getCatalogProducts(supabase, params, categories) {
  let q = supabase.from("product_catalog").select(CATALOG_FIELDS, { count: "exact" });

  if (params.q) q = q.ilike("name", `%${escapeLike(params.q)}%`);
  if (params.category) q = q.in("category_slug", categorySlugsWithChildren(categories, params.category));
  if (params.min !== null) q = q.gte("price", params.min);
  if (params.max !== null) q = q.lte("price", params.max);
  if (params.stock) q = q.gt("stock", 0);
  if (params.sale) q = q.gt("discount_percent", 0);
  if (params.popular) q = q.or("is_featured.eq.true,sales_count.gt.0");

  switch (params.sort) {
    case "new":
      q = q.order("created_at", { ascending: false });
      break;
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "rating":
      q = q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });
      break;
    case "discount":
      q = q.order("discount_percent", { ascending: false });
      break;
    default:
      q = q.order("is_featured", { ascending: false }).order("sales_count", { ascending: false });
  }
  q = q.order("name", { ascending: true });

  const from = (params.page - 1) * PAGE_SIZE;
  q = q.range(from, from + PAGE_SIZE - 1);

  const { data, error, count } = await q;
  // PGRST103: запрошена страница за пределами выборки
  if (error?.code === "PGRST103") return { items: [], total: 0, outOfRange: true };
  check(error);
  return { items: data ?? [], total: count ?? 0, outOfRange: false };
}

export async function getProductBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from("product_catalog")
    .select(CATALOG_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  check(error);
  return data;
}

export async function getProductImages(supabase, productId) {
  const { data, error } = await supabase
    .from("product_images")
    .select("id,url,alt,is_primary,sort_order")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order");
  check(error);
  return data ?? [];
}

export async function getRelatedProducts(supabase, product, limit = 4) {
  const { data, error } = await supabase
    .from("product_catalog")
    .select(CATALOG_FIELDS)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .order("sales_count", { ascending: false })
    .limit(limit);
  check(error);
  return data ?? [];
}

export async function getReviews(supabase, { productId = null, limit = 20 } = {}) {
  let q = supabase
    .from("public_reviews")
    .select("id,product_id,product_name,product_slug,rating,body,photo_url,created_at,author_name")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  check(error);
  return data ?? [];
}

export async function getSetting(supabase, key) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  check(error);
  return data?.value ?? null;
}

export async function getDeliveryZones(supabase) {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id,name,delivery_fee,free_delivery_from,min_order_total,estimated_minutes")
    .order("sort_order");
  check(error);
  return data ?? [];
}

export async function getHomeData(supabase) {
  const list = (build) => build(supabase.from("product_catalog").select(CATALOG_FIELDS));
  const [categories, hits, fresh, seasonal, offers, reviews, banners, promotions, zones, info, productCount, services] =
    await Promise.all([
      getCategories(supabase),
      list((q) =>
        q.order("is_featured", { ascending: false }).order("sales_count", { ascending: false })
          .order("name").limit(8)
      ),
      list((q) => q.eq("is_new", true).order("created_at", { ascending: false }).limit(8)),
      list((q) => q.eq("is_seasonal", true).order("name").limit(8)),
      list((q) => q.gt("discount_percent", 0).order("discount_percent", { ascending: false }).limit(8)),
      getReviews(supabase, { limit: 6 }),
      supabase.from("banners").select("id,title,subtitle,image_url,link_url").eq("is_active", true).order("sort_order"),
      supabase.from("promotions").select("id,name,description,discount_type,discount_value").order("discount_value", { ascending: false }).limit(4),
      getDeliveryZones(supabase),
      getSetting(supabase, "store_info"),
      supabase.from("product_catalog").select("id", { count: "exact", head: true }),
      supabase.from("home_services").select("id,tag,title,description,image_url,link_url").eq("is_active", true).order("sort_order"),
    ]);

  for (const r of [hits, fresh, seasonal, offers, banners, promotions]) check(r.error);
  return {
    categories,
    hits: hits.data ?? [],
    fresh: fresh.data ?? [],
    seasonal: seasonal.data ?? [],
    offers: offers.data ?? [],
    reviews,
    banners: banners.data ?? [],
    promotions: promotions.data ?? [],
    zones,
    info: info ?? {},
    productCount: productCount.count ?? 0,
    services: services.data ?? [],
  };
}
