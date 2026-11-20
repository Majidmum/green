"use client";

import { useState } from "react";
import ReviewForm from "@/components/orders/ReviewForm";

// Кнопка «Оставить отзыв» на позиции доставленного заказа.
export default function ReviewItem({ productId, existing }) {
  const [open, setOpen] = useState(false);
  if (open) return <ReviewForm productId={productId} initial={existing} onDone={() => setOpen(false)} />;
  return (
    <button className="text-xs font-semibold text-brand hover:underline" onClick={() => setOpen(true)}>
      {existing ? "Изменить отзыв" : "Оставить отзыв"}
    </button>
  );
}
