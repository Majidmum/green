import { Apple, Banana, Carrot, Cherry, Citrus, Grape, Leaf } from "lucide-react";

// Фон с плавающими фруктами и овощами. Фиксированный слой за контентом,
// не перехватывает клики; при prefers-reduced-motion анимация отключается (см. globals.css).
const ITEMS = [
  { Icon: Apple, x: "4%", y: "12%", s: 56, d: "0s", t: "18s", c: "text-red-500", hide: false },
  { Icon: Citrus, x: "88%", y: "8%", s: 64, d: "-4s", t: "22s", c: "text-amber-500", hide: false },
  { Icon: Carrot, x: "92%", y: "46%", s: 52, d: "-9s", t: "20s", c: "text-orange-500", hide: true },
  { Icon: Grape, x: "6%", y: "58%", s: 60, d: "-6s", t: "24s", c: "text-purple-600", hide: true },
  { Icon: Cherry, x: "80%", y: "78%", s: 48, d: "-12s", t: "19s", c: "text-rose-600", hide: false },
  { Icon: Banana, x: "14%", y: "86%", s: 56, d: "-3s", t: "23s", c: "text-yellow-500", hide: false },
  { Icon: Leaf, x: "48%", y: "6%", s: 40, d: "-8s", t: "21s", c: "text-brand", hide: true },
  { Icon: Leaf, x: "52%", y: "92%", s: 44, d: "-15s", t: "26s", c: "text-brand", hide: true },
];

export default function FloatingFruits() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {ITEMS.map(({ Icon, x, y, s, d, t, c, hide }, i) => (
        <span
          key={i}
          className={`gg-drift absolute opacity-[0.22] ${c} ${hide ? "hidden md:block" : ""}`}
          style={{ left: x, top: y, animationDelay: d, animationDuration: t }}
        >
          <Icon width={s} height={s} strokeWidth={1.4} />
        </span>
      ))}
    </div>
  );
}
