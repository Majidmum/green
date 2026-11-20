import {
  BarChart3, Bell, ClipboardList, FileText, Image as ImageIcon, LayoutDashboard, Megaphone, MessageSquare,
  Package, Percent, Receipt, ScrollText, Settings, ShieldCheck, ShoppingBag, Tag, Truck, Users, Warehouse, Wallet, Boxes,
} from "lucide-react";

export const ADMIN_NAV = [
  { group: "Обзор", items: [
    { href: "/admin", label: "Дашборд", Icon: LayoutDashboard, exact: true },
    { href: "/admin/reports", label: "Отчёты", Icon: BarChart3 },
  ] },
  { group: "Продажи", items: [
    { href: "/admin/orders", label: "Заказы", Icon: ShoppingBag },
    { href: "/admin/customers", label: "Клиенты", Icon: Users },
    { href: "/admin/reviews", label: "Отзывы", Icon: MessageSquare },
  ] },
  { group: "Каталог", items: [
    { href: "/admin/products", label: "Товары", Icon: Package },
    { href: "/admin/categories", label: "Категории", Icon: Tag },
  ] },
  { group: "Склад", items: [
    { href: "/admin/stock", label: "Остатки", Icon: Warehouse, exact: true },
    { href: "/admin/stock/receive", label: "Приход товара", Icon: Boxes },
    { href: "/admin/stock/writeoff", label: "Списание", Icon: ClipboardList },
    { href: "/admin/stock/stocktake", label: "Инвентаризация", Icon: ClipboardList },
    { href: "/admin/stock/journal", label: "Журнал движений", Icon: ScrollText },
    { href: "/admin/suppliers", label: "Поставщики", Icon: Truck },
  ] },
  { group: "Маркетинг", items: [
    { href: "/admin/promo_codes", label: "Промокоды", Icon: Percent },
    { href: "/admin/promotions", label: "Акции", Icon: Megaphone },
    { href: "/admin/banners", label: "Баннеры", Icon: ImageIcon },
  ] },
  { group: "Финансы", items: [
    { href: "/admin/expenses", label: "Расходы", Icon: Receipt },
  ] },
  { group: "Система", items: [
    { href: "/admin/delivery_zones", label: "Зоны доставки", Icon: Truck },
    { href: "/admin/settings", label: "Настройки и страницы", Icon: Settings },
    { href: "/admin/users", label: "Пользователи и роли", Icon: ShieldCheck },
    { href: "/admin/audit", label: "Журнал действий", Icon: FileText },
    { href: "/admin/notifications", label: "Уведомления", Icon: Bell },
  ] },
];

export const MANAGER_NAV = [
  { group: "Аналитика", items: [
    { href: "/manager", label: "Дашборд", Icon: LayoutDashboard, exact: true },
    { href: "/manager/finance", label: "Финансы", Icon: Wallet },
    { href: "/manager/reports", label: "Отчёты и экспорт", Icon: BarChart3 },
  ] },
  { group: "Контроль", items: [
    { href: "/manager/orders", label: "Заказы", Icon: ShoppingBag },
    { href: "/manager/stock", label: "Склад", Icon: Warehouse },
    { href: "/manager/customers", label: "Клиенты", Icon: Users },
    { href: "/manager/staff", label: "Сотрудники", Icon: ShieldCheck },
    { href: "/manager/audit", label: "Журнал действий", Icon: FileText },
    { href: "/manager/notifications", label: "Уведомления", Icon: Bell },
  ] },
];
