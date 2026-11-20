"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, deleteProductImage, setPrimaryImage } from "@/app/admin/products/actions";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default function ProductImages({ productId, images }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  async function upload(files) {
    setError("");
    setBusy(true);
    const supabase = createClient();
    for (const file of files) {
      if (!TYPES[file.type]) { setError("Допустимы JPG, PNG и WebP"); continue; }
      if (file.size > 5 * 1024 * 1024) { setError(`«${file.name}» больше 5 МБ`); continue; }
      const path = `${productId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (upErr) { setError("Не удалось загрузить файл"); continue; }
      const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      const r = await addProductImage({ productId, url, path });
      if (!r.ok) setError(r.error);
    }
    setBusy(false);
    router.refresh();
  }

  const act = (fn) => start(async () => { setError(""); const r = await fn(); if (!r.ok) setError(r.error); router.refresh(); });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((im) => (
          <figure key={im.id} className="group relative overflow-hidden rounded-xl border border-brand-dark/10">
            <div className="relative aspect-square"><Image src={im.url} alt={im.alt ?? "Фото товара"} fill sizes="160px" className="object-cover" unoptimized /></div>
            {im.is_primary && <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Главное</span>}
            <figcaption className="flex justify-between gap-1 bg-white p-1.5">
              {!im.is_primary ? <button className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-brand hover:bg-brand-light" disabled={pending} onClick={() => act(() => setPrimaryImage({ productId, imageId: im.id }))}><Star size={13} /> Главное</button> : <span />}
              <button className="rounded-full p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Удалить фото" disabled={pending} onClick={() => confirm("Удалить фото?") && act(() => deleteProductImage({ productId, imageId: im.id }))}><Trash2 size={14} /></button>
            </figcaption>
          </figure>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-dark/20 text-sm text-brand-ink/60 hover:border-brand hover:text-brand">
          <ImagePlus size={24} /> {busy ? "Загрузка…" : "Добавить фото"}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.length && upload([...e.target.files])} />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
