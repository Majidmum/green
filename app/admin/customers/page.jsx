import PageHeader from "@/components/admin/PageHeader";
import CustomersList from "@/components/staff/CustomersList";

export const metadata = { title: "Клиенты" };

export default function AdminCustomersPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Клиенты" description="«Выкуплено на» — сумма доставленных заказов. Блокировка и роли — в разделе «Пользователи и роли»." />
      <CustomersList searchParams={searchParams} basePath="/admin/customers" ordersBase="/admin/orders" />
    </>
  );
}
