import Image from "next/image";
import { Apple, Carrot, Cherry, Citrus, Grape } from "lucide-react";

// Лёгкая CSS-композиция для первого экрана. На этапе 8 заменяется на
// 3D-сцену (React Three Fiber) с этим же компонентом как fallback для мобильных.
const TILES = [
  { Icon: Apple, className: "left-[6%] top-[10%] h-16 w-16 bg-surface text-red-500 sm:h-28 sm:w-28", anim: "animate-float" },
  { Icon: Citrus, className: "right-[8%] top-[4%] h-14 w-14 bg-surface text-amber-500 sm:h-24 sm:w-24", anim: "animate-float-slow" },
  { Icon: Carrot, className: "left-[2%] bottom-[14%] h-14 w-14 bg-surface text-orange-500 sm:h-24 sm:w-24", anim: "animate-float-slow" },
  { Icon: Grape, className: "right-[4%] bottom-[10%] h-16 w-16 bg-surface text-purple-600 sm:h-28 sm:w-28", anim: "animate-float" },
  { Icon: Cherry, className: "left-[42%] top-[80%] h-12 w-12 bg-surface text-rose-600 sm:h-20 sm:w-20", anim: "animate-float" },
];

export default function HeroVisual({ className = "" }) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[520px] ${className}`} aria-hidden="true">
      <div className="absolute inset-[6%] rounded-full bg-gradient-to-br from-brand/90 to-brand-dark shadow-lift" />
      <div className="absolute inset-[18%] rounded-full border border-white/20" />
      <div className="absolute left-1/2 top-1/2 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FAF8F2] shadow-lift">
        <Image src="/logo.png" alt="" width={220} height={220} priority className="h-[88%] w-[88%]" />
      </div>
      {TILES.map(({ Icon, className, anim }, i) => (
        <div
          key={i}
          className={`absolute flex items-center justify-center rounded-2xl shadow-lift sm:rounded-3xl ${className} ${anim}`}
        >
          <Icon className="h-1/2 w-1/2" strokeWidth={1.6} />
        </div>
      ))}
    </div>
  );
}
