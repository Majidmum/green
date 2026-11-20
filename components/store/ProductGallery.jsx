"use client";

import { useState } from "react";
import ProductImage from "@/components/store/ProductImage";

export default function ProductGallery({ images, fallback, name }) {
  const list = images.length ? images : fallback ? [{ id: "main", url: fallback, alt: name }] : [];
  const [index, setIndex] = useState(0);
  const current = list[index];

  return (
    <div className="space-y-3">
      <ProductImage
        src={current?.url ?? null}
        alt={current?.alt || name}
        className="aspect-square w-full rounded-xl3"
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
      />
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="list" aria-label="Фотографии товара">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="listitem"
              onClick={() => setIndex(i)}
              aria-label={`Фото ${i + 1}`}
              aria-current={i === index}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === index ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <ProductImage src={img.url} alt={img.alt || name} className="h-full w-full" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
