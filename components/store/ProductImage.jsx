import Image from "next/image";
import { Leaf } from "lucide-react";

// Фото товара из Supabase Storage или нейтральная заглушка, пока фото не загружено.
export default function ProductImage({ src, alt, className = "", priority = false, sizes }) {
  if (!src) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-tint to-surface text-brand/50 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Leaf className="h-1/4 w-1/4 min-h-8 min-w-8" strokeWidth={1.4} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes || "(max-width: 768px) 50vw, 25vw"}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
