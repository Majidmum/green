"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useFavorites } from "@/store/favorites";

export default function FavoriteButton({ productId, className = "", withLabel = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = useFavorites((s) => s.ids.includes(productId));
  const toggle = useFavorites((s) => s.toggle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setBusy(true);
    setError("");
    const r = await toggle(productId);
    setBusy(false);
    if (r.needLogin) router.push(`/login?next=${encodeURIComponent(pathname)}`);
    else if (r.error) setError("Не удалось сохранить");
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "Убрать из избранного" : "В избранное"}
        className={`inline-flex items-center justify-center gap-2 transition disabled:opacity-60 ${className}`}
      >
        <Heart size={18} className={active ? "fill-rose-500 text-rose-500" : "text-brand-dark"} />
        {withLabel && <span className="text-sm font-medium">{active ? "В избранном" : "В избранное"}</span>}
      </button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </>
  );
}
