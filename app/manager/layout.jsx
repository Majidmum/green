import StaffShell from "@/components/admin/StaffShell";
import { requireRole } from "@/lib/supabase/roles";

export const metadata = { title: { default: "Панель руководителя", template: "%s · Руководитель" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }) {
  const { supabase, user, profile } = await requireRole(["manager"]);
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
  return (
    <StaffShell title="Панель руководителя" navKey="manager" userName={profile.full_name || "Руководитель"} roleLabel="Руководитель · только просмотр" unread={count ?? 0} notificationsHref="/manager/notifications">
      {children}
    </StaffShell>
  );
}
