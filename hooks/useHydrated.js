"use client";

import { useEffect, useState } from "react";

// true только после монтирования на клиенте: защита от расхождения SSR/CSR
// для данных из localStorage (корзина).
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
