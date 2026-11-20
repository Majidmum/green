import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Универсальная постраничная навигация. query — текущие параметры (без page).
export function pageHref(basePath, query, page) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "" && k !== "page") sp.set(k, String(v));
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function SimplePagination({ page, total, pageSize, basePath, query }) {
  const last = Math.max(Math.ceil(total / pageSize), 1);
  if (last <= 1) return null;
  const item = "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition";
  const set = new Set([1, last, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Страницы">
      {page > 1 && (
        <Link href={pageHref(basePath, query, page - 1)} className={`${item} bg-surface shadow-soft hover:bg-tint`} aria-label="Назад">
          <ChevronLeft size={16} />
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-body/40">…</span>}
          <Link
            href={pageHref(basePath, query, p)}
            aria-current={p === page ? "page" : undefined}
            className={`${item} ${p === page ? "bg-brand text-white" : "bg-surface shadow-soft hover:bg-tint"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < last && (
        <Link href={pageHref(basePath, query, page + 1)} className={`${item} bg-surface shadow-soft hover:bg-tint`} aria-label="Вперёд">
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}
