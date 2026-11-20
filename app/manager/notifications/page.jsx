import PageHeader from "@/components/admin/PageHeader";
import NotificationsList from "@/components/staff/NotificationsList";
import { requireRole } from "@/lib/supabase/roles";

export const metadata = { title: "Уведомления" };

export default async function ManagerNotificationsPage() {
  const { user } = await requireRole(["manager"]);
  return (
    <>
      <PageHeader title="Уведомления" description="Заказы, низкие остатки и движения склада." />
      <NotificationsList userId={user.id} orderBase="/manager/orders" />
    </>
  );
}
