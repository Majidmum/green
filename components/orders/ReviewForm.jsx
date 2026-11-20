"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveReview } from "@/app/(store)/(account)/actions";

const MAX = 3 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default function ReviewForm({ productId, initial, onDone }) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [photo, setPhoto] = useState(initial?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  async function upload(file) {
    setError("");
    if (!TYPES[file.type]) return setError("Допустимы JPG, PNG и WebP");
    if (file.size > MAX) return setError("Файл больше 3 МБ");
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user.id}/${crypto.randomUUID()}.${TYPES[file.type]}`;
    const { error: upErr } = await supabase.storage.from("review-photos").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (upErr) return setError("Не удалось загрузить фото");
    setPhoto(supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl);
  }

  const submit = () =>
    start(async () => {
      setError("");
      const res = await saveReview({ product_id: productId, rating, body, photo_url: photo || "" });
      if (!res.ok) return setError(res.error);
      setDone(true);
      router.refresh();
      onDone?.();
    });

  if (done) return <p className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark" role="status">Спасибо! Отзыв появится на сайте после проверки.</p>;

  return (
    <div className="space-y-3 rounded-2xl border border-brand-dark/10 bg-brand-cream/50 p-4">
      <div className="flex gap-1" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} из 5`} onClick={() => setRating(i)}>
            <Star size={26} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-brand-dark/25"} />
          </button>
        ))}
      </div>
      <textarea className="input" rows={3} maxLength={1500} placeholder="Расскажите о товаре (необязательно)" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Текст отзыва" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-outline cursor-pointer !px-4 !py-2 text-xs">
          <ImagePlus size={15} /> {uploading ? "Загрузка…" : "Добавить фото"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {photo && (
          <span className="relative h-14 w-14 overflow-hidden rounded-lg">
            <Image src={photo} alt="Фото отзыва" fill sizes="56px" className="object-cover" />
            <button type="button" aria-label="Убрать фото" onClick={() => setPhoto("")} className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"><X size={12} /></button>
          </span>
        )}
      </div>
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary !py-2.5" onClick={submit} disabled={pending || uploading}>{pending ? "Отправляем…" : initial ? "Сохранить отзыв" : "Отправить отзыв"}</button>
        {onDone && <button className="btn-outline !py-2.5" onClick={onDone}>Отмена</button>}
      </div>
    </div>
  );
}
