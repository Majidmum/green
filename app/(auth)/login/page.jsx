import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-redirect";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Вход", robots: { index: false } };

export default async function LoginPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) redirect(next);

  const notice =
    searchParams?.error === "callback"
      ? "Ссылка из письма недействительна или устарела. Попробуйте ещё раз."
      : "";

  return (
    <>
      <h1 className="mb-6 text-center font-display text-3xl font-bold text-brand-dark">Вход</h1>
      <LoginForm next={next} notice={notice} />
    </>
  );
}
