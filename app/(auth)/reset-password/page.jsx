import ResetForm from "@/components/auth/ResetForm";

export const metadata = { title: "Новый пароль", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-6 text-center font-display text-3xl font-bold text-heading">Новый пароль</h1>
      <ResetForm />
    </>
  );
}
