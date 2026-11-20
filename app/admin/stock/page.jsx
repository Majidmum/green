import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import StockTable from "@/components/admin/stock/StockTable";

export const metadata = { title: "Остатки" };

export default function AdminStockPage({ searchParams }) {
  return (
    <>
      <PageHeader title="Остатки склада" description="Остаток меняется только документами: приход, списание, инвентаризация. Продажи и отмены заказов списывают и возвращают товар автоматически.">
        <Link href="/admin/stock/receive" className="btn-primary !py-2.5">Приход</Link>
        <Link href="/admin/stock/writeoff" className="btn-outline !py-2.5">Списание</Link>
        <Link href="/admin/stock/stocktake" className="btn-outline !py-2.5">Инвентаризация</Link>
      </PageHeader>
      <StockTable searchParams={searchParams} basePath="/admin/stock" />
    </>
  );
}
