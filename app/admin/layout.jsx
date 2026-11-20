import StaffShell from "@/components/admin/StaffShell";
import { requireRole } from "@/lib/supabase/roles";

export const metadata = { title: { default: "Админ-панель", template: "%s · Админ" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const { supabase, user, profile } = await requireRole(["admin"]);
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
  return (
    <StaffShell title="Админ-панель" navKey="admin" userName={profile.full_name || "Администратор"} roleLabel="Администратор" unread={count ?? 0} notificationsHref="/admin/notifications">
      {children}
    </StaffShell>
  );
}
