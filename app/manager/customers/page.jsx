import PageHeader from "@/components/admin/PageHeader";
import CustomersList from "@/components/staff/CustomersList";

export const metadata = { title: "Клиенты" };

export default function ManagerCustomersPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Клиенты" description="«Выкуплено на» — сумма доставленных заказов клиента." />
      <CustomersList searchParams={searchParams} basePath="/manager/customers" ordersBase="/manager/orders" />
    </>
  );
}
