import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/data/catalog";

// Юридические страницы редактируются в админ-панели (store_settings → page:<slug>).
export async function getLegalPage(slug) {
  return getSetting(createClient(), `page:${slug}`);
}

export default function LegalPage({ page, children }) {
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-heading">{page.title}</h1>
      <div className="mt-8 whitespace-pre-line leading-relaxed text-body/85">{page.body}</div>
      {children}
    </div>
  );
}
