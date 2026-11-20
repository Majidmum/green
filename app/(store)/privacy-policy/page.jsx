import LegalPage, { getLegalPage } from "@/components/store/LegalPage";

export const metadata = { title: "Политика конфиденциальности" };

export default async function PrivacyPolicyPage() {
  return <LegalPage page={await getLegalPage("privacy-policy")} />;
}
