export const PAGE_SIZE = 12;

export const SORTS = [
  { value: "popular", label: "По популярности" },
  { value: "new", label: "Сначала новые" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "rating", label: "По рейтингу" },
  { value: "discount", label: "По размеру скидки" },
];

function first(v) {
  return Array.isArray(v) ? v[0] : v;
}

function num(v) {
  const s = first(v);
  if (s === undefined || s === null || s === "") return null;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null;
}

// Разбор и валидация query-параметров каталога (всё из URL считается недоверенным)
export function parseCatalogParams(sp = {}) {
  const q = String(first(sp.q) ?? "").trim().slice(0, 80);
  const categoryRaw = String(first(sp.category) ?? "");
  const sort = SORTS.some((s) => s.value === first(sp.sort)) ? first(sp.sort) : "popular";
  const page = Math.max(1, Math.min(1000, parseInt(first(sp.page), 10) || 1));
  return {
    q,
    category: /^[a-z0-9-]{1,64}$/.test(categoryRaw) ? categoryRaw : "",
    min: num(sp.min),
    max: num(sp.max),
    sort,
    stock: first(sp.stock) === "1",
    sale: first(sp.sale) === "1",
    popular: first(sp.popular) === "1",
    view: first(sp.view) === "list" ? "list" : "grid",
    page,
  };
}

const DEFAULTS = { sort: "popular", view: "grid", page: 1 };

// Собирает строку запроса из параметров, пропуская значения по умолчанию
export function buildCatalogQuery(params, overrides = {}) {
  const p = { ...params, ...overrides };
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.category) out.set("category", p.category);
  if (p.min !== null && p.min !== undefined) out.set("min", String(p.min));
  if (p.max !== null && p.max !== undefined) out.set("max", String(p.max));
  if (p.sort && p.sort !== DEFAULTS.sort) out.set("sort", p.sort);
  if (p.stock) out.set("stock", "1");
  if (p.sale) out.set("sale", "1");
  if (p.popular) out.set("popular", "1");
  if (p.view && p.view !== DEFAULTS.view) out.set("view", p.view);
  if (p.page && p.page > 1) out.set("page", String(p.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

// Экранирование спецсимволов шаблона для ILIKE
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
