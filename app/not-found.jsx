import Link from "next/link";

export const metadata = { title: "Страница не найдена" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center">
      <p className="font-display text-8xl font-bold text-brand">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-heading">Страница не найдена</h1>
      <p className="mt-2 max-w-md text-body/70">Возможно, адрес введён с ошибкой или страница была удалена.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">На главную</Link>
        <Link href="/catalog" className="btn-outline">В каталог</Link>
      </div>
    </main>
  );
}
