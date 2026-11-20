import PageHeader from "@/components/admin/PageHeader";
import AuditLog from "@/components/staff/AuditLog";

export const metadata = { title: "Журнал действий" };

export default function ManagerAuditPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Журнал действий" description="Изменения цен, промокодов, акций, настроек, ролей и закупочных цен. Записи неизменяемы." />
      <AuditLog searchParams={searchParams} basePath="/manager/audit" />
    </>
  );
}
