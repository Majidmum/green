import Link from "next/link";
import Logo from "@/components/layout/Logo";
import FloatingFruits from "@/components/animations/FloatingFruits";

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light/70 to-brand-cream px-4 py-10">
      <FloatingFruits />
      <Link href="/" className="mb-8 flex items-center gap-2 font-display text-2xl font-bold text-brand-dark">
        <Logo size={56} priority />
        GREEN GARDEN
      </Link>
      <main className="card w-full max-w-md p-8">{children}</main>
      <Link href="/" className="mt-6 text-sm text-brand-ink/60 hover:text-brand">← Вернуться в магазин</Link>
    </div>
  );
}
