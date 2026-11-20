import { createClient } from "@/lib/supabase/server";
import HeaderBar from "@/components/layout/HeaderBar";

// Серверная часть шапки: определяет пользователя и его роль (для ссылок на панели).
export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    account = {
      name: profile?.full_name || user.email,
      email: user.email,
      role: profile?.is_active ? profile.role : "customer",
    };
  }
  return <HeaderBar account={account} />;
}
