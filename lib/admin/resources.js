// Описание справочников админ-панели. Один конфиг управляет и формой (RHF + Zod),
// и таблицей, и серверным сохранением: клиент ничего не решает сам, сервер
// повторно валидирует по тому же описанию и пишет в БД через RLS.

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Аренда" },
  { value: "salary", label: "Зарплата" },
  { value: "fuel", label: "Топливо" },
  { value: "marketing", label: "Маркетинг" },
  { value: "utilities", label: "Коммунальные" },
  { value: "other", label: "Прочее" },
];
const DISCOUNT_TYPES = [
  { value: "percent", label: "Процент, %" },
  { value: "fixed", label: "Фиксированная, сом." },
];

export const EXPENSE_CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

export const RESOURCES = {
  categories: {
    table: "categories",
    title: "Категории",
    singular: "категория",
    orderBy: [["sort_order", true], ["name", true]],
    fields: [
      { name: "name", label: "Название", type: "text", required: true, max: 80 },
      { name: "slug", label: "Адрес (slug)", type: "text", required: true, max: 80, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", patternMsg: "Латиница, цифры и дефисы, например: fruits", hint: "Часть ссылки: /catalog?category=slug" },
      { name: "parent_id", label: "Родительская категория", type: "select", optionsFrom: "categories", nullable: true, excludeSelf: true },
      { name: "description", label: "Описание", type: "textarea", max: 500 },
      { name: "image_url", label: "Изображение", type: "image", bucket: "product-images", folder: "categories" },
      { name: "sort_order", label: "Порядок", type: "number", int: true, min: 0, max: 100000, default: 0 },
      { name: "is_active", label: "Показывать на сайте", type: "checkbox", default: true },
    ],
    columns: [
      { key: "name", label: "Название" },
      { key: "slug", label: "Slug", muted: true },
      { key: "parent_id", label: "Родитель", format: "lookup:categories" },
      { key: "sort_order", label: "Порядок" },
      { key: "is_active", label: "Активна", format: "bool" },
    ],
  },

  suppliers: {
    table: "suppliers",
    title: "Поставщики",
    singular: "поставщик",
    orderBy: [["name", true]],
    fields: [
      { name: "name", label: "Название", type: "text", required: true, max: 120 },
      { name: "phone", label: "Телефон", type: "text", max: 30 },
      { name: "email", label: "Email", type: "text", max: 120, email: true },
      { name: "address", label: "Адрес", type: "text", max: 200 },
      { name: "note", label: "Заметка", type: "textarea", max: 500 },
      { name: "is_active", label: "Активен", type: "checkbox", default: true },
    ],
    columns: [
      { key: "name", label: "Название" },
      { key: "phone", label: "Телефон" },
      { key: "email", label: "Email" },
      { key: "is_active", label: "Активен", format: "bool" },
    ],
  },

  promo_codes: {
    table: "promo_codes",
    title: "Промокоды",
    singular: "промокод",
    orderBy: [["created_at", false]],
    fields: [
      { name: "code", label: "Код", type: "text", required: true, max: 40, upper: true, pattern: "^[A-Z0-9_-]+$", patternMsg: "Латиница, цифры, - и _" },
      { name: "description", label: "Описание", type: "text", max: 200 },
      { name: "discount_type", label: "Тип скидки", type: "select", options: DISCOUNT_TYPES, required: true, default: "percent" },
      { name: "discount_value", label: "Размер скидки", type: "number", required: true, min: 0.01, max: 1000000 },
      { name: "min_order_total", label: "Мин. сумма заказа", type: "number", min: 0, default: 0 },
      { name: "max_discount", label: "Макс. скидка, сом.", type: "number", min: 0.01, nullable: true, hint: "Оставьте пустым — без ограничения" },
      { name: "usage_limit", label: "Общий лимит использований", type: "number", int: true, min: 1, nullable: true },
      { name: "per_user_limit", label: "Лимит на клиента", type: "number", int: true, min: 1, nullable: true },
      { name: "starts_at", label: "Действует с", type: "datetime", nullable: true },
      { name: "expires_at", label: "Действует до", type: "datetime", nullable: true },
      { name: "is_active", label: "Активен", type: "checkbox", default: true },
    ],
    refine: "discount",
    columns: [
      { key: "code", label: "Код", strong: true },
      { key: "discount_value", label: "Скидка", format: "discount" },
      { key: "min_order_total", label: "От суммы", format: "money" },
      { key: "used_count", label: "Использован" },
      { key: "expires_at", label: "До", format: "datetime" },
      { key: "is_active", label: "Активен", format: "bool" },
    ],
  },

  promotions: {
    table: "promotions",
    title: "Акции",
    singular: "акция",
    orderBy: [["created_at", false]],
    fields: [
      { name: "name", label: "Название", type: "text", required: true, max: 120 },
      { name: "description", label: "Описание", type: "text", max: 300 },
      { name: "image_url", label: "Фото для главной", type: "image", bucket: "banners", folder: "promotions", hint: "Горизонтальное фото фруктов или овощей" },
      { name: "discount_type", label: "Тип скидки", type: "select", options: DISCOUNT_TYPES, required: true, default: "percent" },
      { name: "discount_value", label: "Размер скидки", type: "number", required: true, min: 0.01, max: 1000000 },
      { name: "product_id", label: "Товар", type: "select", optionsFrom: "products", nullable: true, hint: "Товар или категория; если оба пусты — на весь ассортимент" },
      { name: "category_id", label: "Категория", type: "select", optionsFrom: "categories", nullable: true },
      { name: "starts_at", label: "Начало", type: "datetime", nullable: true },
      { name: "ends_at", label: "Окончание", type: "datetime", nullable: true },
      { name: "is_active", label: "Активна", type: "checkbox", default: true },
    ],
    refine: "discount",
    columns: [
      { key: "name", label: "Название", strong: true },
      { key: "discount_value", label: "Скидка", format: "discount" },
      { key: "product_id", label: "Товар", format: "lookup:products" },
      { key: "category_id", label: "Категория", format: "lookup:categories" },
      { key: "ends_at", label: "До", format: "datetime" },
      { key: "is_active", label: "Активна", format: "bool" },
    ],
  },

  banners: {
    table: "banners",
    title: "Баннеры",
    singular: "баннер",
    orderBy: [["sort_order", true]],
    fields: [
      { name: "title", label: "Заголовок", type: "text", required: true, max: 120 },
      { name: "subtitle", label: "Подзаголовок", type: "text", max: 200 },
      { name: "image_url", label: "Изображение", type: "image", bucket: "banners", folder: "home" },
      { name: "link_url", label: "Ссылка", type: "text", max: 300, hint: "Например: /catalog?sale=1" },
      { name: "sort_order", label: "Порядок", type: "number", int: true, min: 0, max: 100000, default: 0 },
      { name: "is_active", label: "Показывать", type: "checkbox", default: true },
    ],
    columns: [
      { key: "title", label: "Заголовок", strong: true },
      { key: "link_url", label: "Ссылка", muted: true },
      { key: "sort_order", label: "Порядок" },
      { key: "is_active", label: "Показывается", format: "bool" },
    ],
  },

  home_services: {
    table: "home_services",
    title: "Блоки сервисов на главной",
    singular: "блок",
    orderBy: [["sort_order", true]],
    fields: [
      { name: "tag", label: "Рубрика (над заголовком)", type: "text", max: 40, hint: "Например: Доставка" },
      { name: "title", label: "Заголовок", type: "text", required: true, max: 80 },
      { name: "description", label: "Текст", type: "textarea", max: 300 },
      { name: "image_url", label: "Фото", type: "image", bucket: "banners", folder: "services", hint: "Лучше горизонтальное, 1200×800 px" },
      { name: "link_url", label: "Ссылка", type: "text", max: 300, hint: "Например: /delivery" },
      { name: "sort_order", label: "Порядок", type: "number", int: true, min: 0, max: 100000, default: 0 },
      { name: "is_active", label: "Показывать", type: "checkbox", default: true },
    ],
    columns: [
      { key: "title", label: "Заголовок", strong: true },
      { key: "tag", label: "Рубрика", muted: true },
      { key: "link_url", label: "Ссылка", muted: true },
      { key: "sort_order", label: "Порядок" },
      { key: "is_active", label: "Показывается", format: "bool" },
    ],
  },

  delivery_zones: {
    table: "delivery_zones",
    title: "Зоны доставки",
    singular: "зона",
    orderBy: [["sort_order", true], ["name", true]],
    fields: [
      { name: "name", label: "Название района", type: "text", required: true, max: 80 },
      { name: "delivery_fee", label: "Стоимость доставки, сом.", type: "number", required: true, min: 0, default: 0 },
      { name: "free_delivery_from", label: "Бесплатно от суммы, сом.", type: "number", min: 0, nullable: true, hint: "Пусто — бесплатной доставки нет" },
      { name: "min_order_total", label: "Мин. сумма заказа, сом.", type: "number", min: 0, default: 0 },
      { name: "estimated_minutes", label: "Время доставки, мин.", type: "number", int: true, min: 1, max: 10000, nullable: true },
      { name: "sort_order", label: "Порядок", type: "number", int: true, min: 0, max: 100000, default: 0 },
      { name: "is_active", label: "Активна", type: "checkbox", default: true },
    ],
    columns: [
      { key: "name", label: "Район", strong: true },
      { key: "delivery_fee", label: "Доставка", format: "money" },
      { key: "free_delivery_from", label: "Бесплатно от", format: "money" },
      { key: "min_order_total", label: "Мин. заказ", format: "money" },
      { key: "is_active", label: "Активна", format: "bool" },
    ],
  },

  expenses: {
    table: "expenses",
    title: "Расходы",
    singular: "расход",
    orderBy: [["expense_date", false], ["created_at", false]],
    voidInsteadOfDelete: true,
    createdBy: true,
    fields: [
      { name: "expense_date", label: "Дата", type: "date", required: true },
      { name: "category", label: "Категория", type: "select", options: EXPENSE_CATEGORIES, required: true, default: "other" },
      { name: "amount", label: "Сумма, сом.", type: "number", required: true, min: 0.01, max: 100000000 },
      { name: "description", label: "Описание", type: "text", max: 300 },
    ],
    columns: [
      { key: "expense_date", label: "Дата", format: "day" },
      { key: "category", label: "Категория", format: "expcat" },
      { key: "amount", label: "Сумма", format: "money", strong: true },
      { key: "description", label: "Описание", muted: true },
      { key: "is_voided", label: "Статус", format: "voided" },
    ],
  },
};
