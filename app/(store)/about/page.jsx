import Link from "next/link";
import { Leaf, ShieldCheck, Truck } from "lucide-react";

export const metadata = {
  title: "О нас",
  description: "Green Garden — интернет-магазин свежих фруктов, овощей, ягод и зелени в Душанбе.",
};

const VALUES = [
  { Icon: Leaf, title: "Свежесть", text: "Фрукты, овощи, ягоды и зелень — то, что нужно для ежедневного стола." },
  { Icon: ShieldCheck, title: "Качество", text: "Мы следим за качеством продукции и честно показываем наличие и цену на каждой карточке." },
  { Icon: Truck, title: "Удобство", text: "Заказ в несколько кликов, доставка по Душанбе или самовывоз." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-heading">О Green Garden</h1>
      <p className="mt-6 text-lg leading-relaxed text-body/80">
        Green Garden — интернет-магазин свежих фруктов, овощей, ягод, зелени, сухофруктов и орехов в Душанбе.
        Мы хотим, чтобы свежие продукты высокого качества были доступны каждому: выбирайте онлайн, а мы
        привезём заказ или подготовим его к самовывозу.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {VALUES.map(({ Icon, title, text }) => (
          <div key={title} className="card p-6">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand"><Icon size={24} /></span>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-body/70">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/catalog" className="btn-primary">Перейти в каталог</Link>
        <Link href="/contacts" className="btn-outline">Связаться с нами</Link>
      </div>
    </div>
  );
}
