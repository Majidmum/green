import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/safe-redirect";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Регистрация", robots: { index: false } };

export default async function RegisterPage({ searchParams }) {
  const next = safeNext(searchParams?.next);
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) redirect(next);

  return (
    <>
      <h1 className="mb-6 text-center font-display text-3xl font-bold text-brand-dark">Регистрация</h1>
      <RegisterForm next={next} />
    </>
  );
}
