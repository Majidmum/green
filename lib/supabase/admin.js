import "server-only";
import { createClient } from "@supabase/supabase-js";

// Клиент с service role: обходит RLS. Использовать ТОЛЬКО в серверном коде
// (Route Handlers / Server Actions) после проверки роли пользователя.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
