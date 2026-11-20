"use client";

import { Minus, Plus } from "lucide-react";
import { formatQty, round3 } from "@/lib/utils/format";

export default function QuantityStepper({ value, onChange, step = 1, max, unit, label = "Количество" }) {
  const atMin = value <= step;
  const atMax = value >= max;
  return (
    <div className="inline-flex items-center rounded-full border border-heading/15 bg-surface" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(step, round3(value - step)))}
        disabled={atMin}
        className="flex h-10 w-10 items-center justify-center rounded-full text-heading transition hover:bg-tint disabled:opacity-30"
        aria-label="Уменьшить количество"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {formatQty(value, unit)}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, round3(value + step)))}
        disabled={atMax}
        className="flex h-10 w-10 items-center justify-center rounded-full text-heading transition hover:bg-tint disabled:opacity-30"
        aria-label="Увеличить количество"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
