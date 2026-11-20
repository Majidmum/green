"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export const useFavorites = create((set, get) => ({
  ids: [],
  loaded: false,
  userId: null,

  async load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ ids: [], loaded: true, userId: null });
      return;
    }
    const { data } = await supabase.from("favorites").select("product_id");
    set({ ids: (data ?? []).map((r) => r.product_id), loaded: true, userId: user.id });
  },

  /** Возвращает { needLogin } или { error } или {} при успехе. */
  async toggle(productId) {
    if (!get().loaded) await get().load();
    const { userId, ids } = get();
    if (!userId) return { needLogin: true };

    const supabase = createClient();
    const has = ids.includes(productId);
    set({ ids: has ? ids.filter((i) => i !== productId) : [...ids, productId] });

    const res = has
      ? await supabase.from("favorites").delete().eq("user_id", userId).eq("product_id", productId)
      : await supabase.from("favorites").insert({ user_id: userId, product_id: productId });

    if (res.error) {
      set({ ids }); // откат
      return { error: res.error.message };
    }
    return {};
  },
}));
