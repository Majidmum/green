"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import Stars from "@/components/store/Stars";
import ReviewForm from "@/components/orders/ReviewForm";
import { deleteReview } from "@/app/(store)/(account)/actions";
import { formatDay } from "@/lib/utils/format";

const STATUS = {
  pending: ["На проверке", "bg-amber-100 text-amber-800"],
  approved: ["Опубликован", "bg-emerald-100 text-emerald-800"],
  rejected: ["Отклонён", "bg-rose-100 text-rose-700"],
};

export default function MyReviewCard({ review, product }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [label, cls] = STATUS[review.status] ?? STATUS.pending;

  if (editing) return <ReviewForm productId={review.product_id} initial={review} onDone={() => setEditing(false)} />;

  return (
    <article className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {product ? <Link href={`/product/${product.slug}`} className="font-semibold text-brand hover:underline">{product.name}</Link> : <span className="font-semibold">Товар</span>}
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
      </div>
      <Stars value={review.rating} />
      {review.body && <p className="text-sm text-brand-ink/80">{review.body}</p>}
      {review.photo_url && <div className="relative h-24 w-24 overflow-hidden rounded-xl"><Image src={review.photo_url} alt="Фото к отзыву" fill sizes="96px" className="object-cover" /></div>}
      <div className="flex items-center justify-between text-xs text-brand-ink/50">
        <span>{formatDay(review.created_at)}</span>
        <span className="flex gap-3">
          <button className="inline-flex items-center gap-1 font-medium text-brand" onClick={() => setEditing(true)}><Pencil size={13} /> Изменить</button>
          <button className="inline-flex items-center gap-1 font-medium text-rose-600" disabled={pending}
            onClick={() => confirm("Удалить отзыв?") && start(async () => { const r = await deleteReview(review.id); if (!r.ok) setError(r.error); })}>
            <Trash2 size={13} /> Удалить
          </button>
        </span>
      </div>
      {review.status === "rejected" && <p className="text-xs text-brand-ink/60">Отзыв не прошёл модерацию. Вы можете изменить текст и отправить его снова.</p>}
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
    </article>
  );
}
