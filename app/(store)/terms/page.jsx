import LegalPage, { getLegalPage } from "@/components/store/LegalPage";

export const metadata = { title: "Условия использования" };

export default async function TermsPage() {
  return <LegalPage page={await getLegalPage("terms")} />;
}
