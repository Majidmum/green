import { createClient } from "@/lib/supabase/server";
import CartView from "@/components/cart/CartView";

export const metadata = { title: "Корзина", robots: { index: false } };

export default async function CartPage() {
  const {
    data: { user },
  } = await createClient().auth.getUser();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold text-brand-dark">Корзина</h1>
      <CartView isLoggedIn={Boolean(user)} />
    </div>
  );
}
