import FinanceView from "@/components/analytics/FinanceView";

export const metadata = { title: "Финансы" };

export default function ManagerFinancePage({ searchParams }) {
  return <FinanceView searchParams={searchParams} basePath="/manager/finance" />;
}
