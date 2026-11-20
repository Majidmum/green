import ReportsView from "@/components/analytics/ReportsView";

export const metadata = { title: "Отчёты" };

export default function AdminReportsPage({ searchParams }) {
  return <ReportsView searchParams={searchParams} basePath="/admin/reports" />;
}
