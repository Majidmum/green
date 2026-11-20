"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Загрузка в Supabase Storage из браузера. Права проверяет Storage RLS (только админ).
export default function ImageUpload({ value, onChange, bucket, folder, id }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file) {
    setErr("");
    if (!TYPES[file.type]) return setErr("Допустимы JPG, PNG и WebP");
    if (file.size > 5 * 1024 * 1024) return setErr("Файл больше 5 МБ");
    setBusy(true);
    const supabase = createClient();
    const path = `${folder}/${crypto.randomUUID()}.${TYPES[file.type]}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return setErr("Не удалось загрузить файл");
    onChange(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-outline cursor-pointer !px-4 !py-2 text-xs">
          <ImagePlus size={15} /> {busy ? "Загрузка…" : value ? "Заменить" : "Загрузить"}
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {value && (
          <span className="relative h-16 w-16 overflow-hidden rounded-xl border border-heading/10">
            <Image src={value} alt="Предпросмотр" fill sizes="64px" className="object-cover" unoptimized />
            <button type="button" aria-label="Убрать изображение" onClick={() => onChange("")} className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"><X size={12} /></button>
          </span>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-rose-600" role="alert">{err}</p>}
    </div>
  );
}
