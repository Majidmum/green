import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/admin/resources";
import { ORDER_STATUSES, UNITS } from "@/lib/constants";

export const dynamic = "force-dynamic";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Экспорт отчёта в Excel. Доступ: только администратор и руководитель (проверка на сервере, плюс RLS/RPC).
export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || !["admin", "manager"].includes(profile.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  const sp = new URL(request.url).searchParams;
  const from = sp.get("from"), to = sp.get("to");
  if (!DATE.test(from ?? "") || !DATE.test(to ?? "") || from > to) return NextResponse.json({ error: "Неверный период" }, { status: 400 });

  const { data: rep, error } = await supabase.rpc("report_dashboard", { p_from: from, p_to: to });
  if (error) return NextResponse.json({ error: "Не удалось построить отчёт" }, { status: 400 });
  const startTs = `${from}T00:00:00+05:00`;
  const endTs = new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86400000).toISOString();
  const [{ data: orders }, { data: expenses }] = await Promise.all([
    supabase.from("orders").select("order_number,created_at,status,customer_name,customer_phone,delivery_type,subtotal,promo_discount,delivery_fee,total").gte("created_at", startTs).lt("created_at", endTs).order("created_at").limit(5000),
    supabase.from("expenses").select("expense_date,category,amount,description,is_voided").gte("expense_date", from).lte("expense_date", to).order("expense_date").limit(5000),
  ]);

  const k = rep.kpis;
  const status = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label]));
  const unit = (u) => UNITS.find((x) => x.value === u)?.label ?? u;
  const wb = XLSX.utils.book_new();
  const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Нет данных": "" }]), name);

  add("Сводка", [
    { Показатель: "Период", Значение: `${from} — ${to}` },
    { Показатель: "Выручка по доставленным заказам", Значение: Number(k.revenue_before_returns) },
    { Показатель: "Возвраты клиентам", Значение: -Number(k.returns_amount) },
    { Показатель: "Выручка", Значение: Number(k.revenue) },
    { Показатель: "Себестоимость проданного", Значение: -Number(k.cogs) },
    { Показатель: "Валовая прибыль", Значение: Number(k.gross_profit) },
    { Показатель: "Операционные расходы", Значение: -Number(k.expenses) },
    { Показатель: "Списания (порча, потери)", Значение: -Number(k.writeoffs) },
    { Показатель: "Чистая прибыль", Значение: Number(k.net_profit) },
    { Показатель: "Заказов создано", Значение: Number(k.orders_created) },
    { Показатель: "Заказов доставлено", Значение: Number(k.orders_delivered) },
    { Показатель: "Заказов отменено", Значение: Number(k.orders_cancelled) },
    { Показатель: "Средний чек", Значение: Number(k.avg_check) },
    { Показатель: "Новых клиентов", Значение: Number(k.customers_new) },
    { Показатель: "Стоимость склада (на сегодня)", Значение: Number(k.stock_value) },
  ]);
  add("По дням", rep.series.map((d) => ({ Дата: d.day, "Заказов создано": Number(d.orders), Доставлено: Number(d.delivered), Отменено: Number(d.cancelled), Выручка: Number(d.revenue), Себестоимость: Number(d.cogs), "Валовая прибыль": Number(d.revenue) - Number(d.cogs) })));
  add("Товары", rep.top_products.map((p) => ({ Товар: p.name, Ед: unit(p.unit), Продано: Number(p.qty), Выручка: Number(p.revenue) })));
  add("Категории", rep.top_categories.map((c) => ({ Категория: c.name, Заказов: Number(c.orders), Выручка: Number(c.revenue) })));
  add("Заказы", (orders ?? []).map((o) => ({ Номер: o.order_number, Создан: o.created_at, Статус: status[o.status] ?? o.status, Клиент: o.customer_name, Телефон: o.customer_phone, Получение: o.delivery_type === "delivery" ? "Доставка" : "Самовывоз", Товары: Number(o.subtotal), Промокод: -Number(o.promo_discount), Доставка: Number(o.delivery_fee), Итого: Number(o.total) })));
  add("Расходы", (expenses ?? []).map((e) => ({ Дата: e.expense_date, Категория: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category, Сумма: Number(e.amount), Описание: e.description ?? "", Аннулирован: e.is_voided ? "да" : "" })));

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="green-garden-report-${from}_${to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
