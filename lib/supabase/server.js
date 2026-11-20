import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Серверный клиент от имени вошедшего пользователя (работает через RLS).
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Вызов из Server Component: обновление сессии выполнит middleware.
          }
        },
      },
    }
  );
}
