import { Search } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/constants";

// GET-форма: фильтры живут в адресе страницы, работают без JavaScript.
export default function OrdersFilters({ params, basePath }) {
  return (
    <form action={basePath} method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="relative lg:col-span-2">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body/40" />
        <input name="q" defaultValue={params.q} className="input !pl-9" placeholder="Номер, имя, телефон" aria-label="Поиск заказа" />
      </div>
      <select name="status" defaultValue={params.status} className="input" aria-label="Статус">
        <option value="">Все статусы</option>
        {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select name="type" defaultValue={params.type} className="input" aria-label="Способ получения">
        <option value="">Доставка и самовывоз</option>
        <option value="delivery">Доставка</option>
        <option value="pickup">Самовывоз</option>
      </select>
      <input type="date" name="from" defaultValue={params.from} className="input" aria-label="С даты" />
      <input type="date" name="to" defaultValue={params.to} className="input" aria-label="По дату" />
      <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
        <button className="btn-primary !py-2.5">Применить</button>
        <a href={basePath} className="btn-outline !py-2.5">Сбросить</a>
      </div>
    </form>
  );
}
