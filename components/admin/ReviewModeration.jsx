"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Trash2, X } from "lucide-react";
import Stars from "@/components/store/Stars";
import { moderateReview, removeReview } from "@/app/admin/reviews/actions";
import { formatDate } from "@/lib/utils/format";

export default function ReviewModeration({ review }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = (fn) => start(async () => { setError(""); const r = await fn(); if (!r.ok) setError(r.error); else router.refresh(); });

  return (
    <article className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold">{review.product_name}</p><p className="text-xs text-brand-ink/60">{review.author} · {formatDate(review.created_at)}</p></div>
        <Stars value={review.rating} />
      </div>
      {review.body ? <p className="text-sm text-brand-ink/80">{review.body}</p> : <p className="text-sm italic text-brand-ink/40">Без текста</p>}
      {review.photo_url && <div className="relative h-28 w-28 overflow-hidden rounded-xl"><Image src={review.photo_url} alt="Фото отзыва" fill sizes="112px" className="object-cover" unoptimized /></div>}
      <div className="flex flex-wrap gap-2">
        {review.status !== "approved" && <button className="btn-primary !px-4 !py-2 text-xs" disabled={pending} onClick={() => run(() => moderateReview({ id: review.id, status: "approved" }))}><Check size={14} /> Одобрить</button>}
        {review.status !== "rejected" && <button className="btn-outline !px-4 !py-2 text-xs" disabled={pending} onClick={() => run(() => moderateReview({ id: review.id, status: "rejected" }))}><X size={14} /> Отклонить</button>}
        <button className="btn-outline !border-rose-300 !px-4 !py-2 text-xs !text-rose-600" disabled={pending} onClick={() => confirm("Удалить отзыв навсегда?") && run(() => removeReview(review.id))}><Trash2 size={14} /> Удалить</button>
      </div>
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
    </article>
  );
}
