import ForgotForm from "@/components/auth/ForgotForm";

export const metadata = { title: "Восстановление пароля", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-center font-display text-3xl font-bold text-heading">Восстановление пароля</h1>
      <p className="mb-6 text-center text-sm text-body/70">Укажите email — мы отправим ссылку для создания нового пароля.</p>
      <ForgotForm />
    </>
  );
}
