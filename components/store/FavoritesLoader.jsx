"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "@/store/favorites";

// Подгружает избранное при входе/выходе пользователя.
export default function FavoritesLoader() {
  const load = useFavorites((s) => s.load);
  useEffect(() => {
    load();
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);
  return null;
}
