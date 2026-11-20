"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-4 text-center">
      <p className="font-display text-8xl font-bold text-brand">500</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-heading">Что-то пошло не так</h1>
      <p className="mt-2 max-w-md text-body/70">Мы уже знаем о проблеме. Попробуйте обновить страницу или зайдите позже.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={() => reset()} className="btn-primary">Попробовать снова</button>
        <Link href="/" className="btn-outline">На главную</Link>
      </div>
    </main>
  );
}
