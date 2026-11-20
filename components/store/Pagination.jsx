import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE, buildCatalogQuery } from "@/lib/utils/catalog-params";

function pageList(current, last) {
  const set = new Set([1, last, current - 1, current, current + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("gap-" + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ params, total, basePath = "/catalog" }) {
  const last = Math.ceil(total / PAGE_SIZE);
  if (last <= 1) return null;
  const href = (page) => `${basePath}${buildCatalogQuery(params, { page })}`;
  const item = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Страницы каталога">
      {params.page > 1 ? (
        <Link href={href(params.page - 1)} className={`${item} bg-surface shadow-soft hover:bg-tint`} aria-label="Предыдущая страница">
          <ChevronLeft size={18} />
        </Link>
      ) : null}
      {pageList(params.page, last).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-body/40" aria-hidden="true">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === params.page ? "page" : undefined}
            className={`${item} ${p === params.page ? "bg-brand text-white" : "bg-surface shadow-soft hover:bg-tint"}`}
          >
            {p}
          </Link>
        )
      )}
      {params.page < last ? (
        <Link href={href(params.page + 1)} className={`${item} bg-surface shadow-soft hover:bg-tint`} aria-label="Следующая страница">
          <ChevronRight size={18} />
        </Link>
      ) : null}
    </nav>
  );
}
