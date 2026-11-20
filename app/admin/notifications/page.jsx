import PageHeader from "@/components/admin/PageHeader";
import NotificationsList from "@/components/staff/NotificationsList";
import { requireRole } from "@/lib/supabase/roles";

export const metadata = { title: "Уведомления" };

export default async function AdminNotificationsPage() {
  const { user } = await requireRole(["admin"]);
  return (
    <>
      <PageHeader title="Уведомления" description="Новые заказы, низкие остатки, новые отзывы, приходы и инвентаризации." />
      <NotificationsList userId={user.id} orderBase="/admin/orders" />
    </>
  );
}
