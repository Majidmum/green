import KpiGrid from "@/components/analytics/KpiGrid";
import { CustomersChart, HoursChart, OrdersChart, RevenueChart, TopCategoriesChart, TopProductsChart } from "@/components/analytics/Charts";

export default function AnalyticsDashboard({ cur, prev }) {
  return (
    <>
      <KpiGrid cur={cur} prev={prev} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2"><RevenueChart series={cur.series} /></div>
        <OrdersChart series={cur.series} />
        <HoursChart items={cur.by_hour} />
        <TopProductsChart items={cur.top_products} />
        <TopCategoriesChart items={cur.top_categories} />
        <div className="xl:col-span-2"><CustomersChart series={cur.series} /></div>
      </div>
    </>
  );
}
