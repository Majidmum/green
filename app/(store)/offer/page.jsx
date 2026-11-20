import LegalPage, { getLegalPage } from "@/components/store/LegalPage";

export const metadata = { title: "Публичная оферта" };

export default async function OfferPage() {
  return <LegalPage page={await getLegalPage("offer")} />;
}
