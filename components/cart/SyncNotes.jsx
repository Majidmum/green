import { formatMoney } from "@/lib/utils/format";

const TEXT = {
  removed: (n) => `«${n.name}» больше недоступен и удалён из корзины.`,
  soldout: (n) => `«${n.name}» закончился. Удалите его, чтобы оформить заказ.`,
  reduced: (n) => `Количество «${n.name}» уменьшено до доступного остатка.`,
  price: (n) => `Цена «${n.name}» изменилась: ${formatMoney(n.from)} → ${formatMoney(n.to)}.`,
};

export default function SyncNotes({ notes }) {
  if (!notes.length) return null;
  return (
    <ul className="mb-6 space-y-1 rounded-xl2 bg-amber-50 px-5 py-4 text-sm text-amber-900" role="status">
      {notes.map((n, i) => (
        <li key={i}>{TEXT[n.type](n)}</li>
      ))}
    </ul>
  );
}
