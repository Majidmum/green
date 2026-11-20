import Link from "next/link";
import Image from "next/image";
import Stars from "@/components/store/Stars";
import { formatDay } from "@/lib/utils/format";

export default function ReviewCard({ review, showProduct = true }) {
  return (
    <article className="card flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} />
        <time className="text-xs text-brand-ink/50" dateTime={review.created_at}>
          {formatDay(review.created_at)}
        </time>
      </div>
      {review.body && <p className="text-sm leading-relaxed text-brand-ink/80">{review.body}</p>}
      {review.photo_url && (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl">
          <Image src={review.photo_url} alt="Фото к отзыву" fill sizes="128px" className="object-cover" />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{review.author_name}</span>
        {showProduct && review.product_slug && (
          <Link href={`/product/${review.product_slug}`} className="truncate text-brand hover:underline">
            {review.product_name}
          </Link>
        )}
      </div>
    </article>
  );
}
