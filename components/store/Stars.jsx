import { Star } from "lucide-react";

export default function Stars({ value = 0, count, size = 14 }) {
  const v = Number(value) || 0;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Рейтинг ${v.toFixed(1)} из 5`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(v) ? "fill-amber-400 text-amber-400" : "text-brand-dark/20"}
          />
        ))}
      </span>
      {count !== undefined && (
        <span className="text-xs text-brand-ink/60">
          {count > 0 ? `${v.toFixed(1)} (${count})` : "Нет отзывов"}
        </span>
      )}
    </span>
  );
}
