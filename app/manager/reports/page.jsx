import ReportsView from "@/components/analytics/ReportsView";

export const metadata = { title: "Отчёты" };

export default function ManagerReportsPage({ searchParams }) {
  return <ReportsView searchParams={searchParams} basePath="/manager/reports" />;
}
