import PageHeader from "@/components/admin/PageHeader";
import StockJournal from "@/components/admin/stock/StockJournal";

export const metadata = { title: "Журнал движений" };

export default function JournalPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Журнал движений склада" description="Записи нельзя изменить или удалить: ошибка исправляется новой операцией." />
      <StockJournal searchParams={searchParams} basePath="/admin/stock/journal" />
    </>
  );
}
