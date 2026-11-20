-- ============================================================================
-- GREEN GARDEN — 001: схема (типы, таблицы, индексы)
-- ============================================================================
-- Модель склада:
--   * inventory               — текущий остаток и средняя себестоимость (изменяется ТОЛЬКО через RPC);
--   * inventory_transactions  — неизменяемый журнал движений (UPDATE/DELETE запрещены триггером).
-- Остаток списывается в момент создания заказа и возвращается при его отмене.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- Типы -----------------------------------------------------------
create type public.user_role      as enum ('customer', 'admin', 'manager');
create type public.product_unit   as enum ('kg', 'g', 'pcs', 'pack');
-- Порядок значений важен: статусы можно переводить только вперёд (cancelled — последний).
create type public.order_status   as enum (
  'pending', 'confirmed', 'assembling', 'ready',
  'handed_to_courier', 'on_the_way', 'delivered', 'cancelled'
);
create type public.delivery_type  as enum ('delivery', 'pickup');
create type public.payment_method as enum ('cash_on_delivery', 'pay_on_pickup', 'online');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.inventory_tx_type as enum (
  'purchase', 'sale', 'sale_cancel', 'write_off',
  'supplier_return', 'customer_return', 'adjustment'
);
create type public.review_status  as enum ('pending', 'approved', 'rejected');
create type public.discount_type  as enum ('percent', 'fixed');

-- ---------- Номер заказа ---------------------------------------------------
create sequence public.order_number_seq;

create function public.generate_order_number()
returns text
language sql
volatile
as $$
  select 'GG-'
    || to_char(now() at time zone 'Asia/Dushanbe', 'YYMMDD')
    || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

-- ---------- 1. profiles ----------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  email       text,
  role        public.user_role not null default 'customer',
  is_active   boolean not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ---------- 2. categories --------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete set null,
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

-- ---------- 3. products ----------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories (id) on delete restrict,
  name              text not null,
  slug              text not null unique,
  description       text,
  price             numeric(12,2) not null check (price >= 0),
  old_price         numeric(12,2) check (old_price is null or old_price >= 0),
  unit              public.product_unit not null default 'kg',
  step              numeric(8,3) not null default 1 check (step > 0),  -- шаг количества (0.5 кг, 1 шт.)
  min_stock         numeric(12,3) not null default 0 check (min_stock >= 0),
  country_of_origin text,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  is_new            boolean not null default false,
  is_seasonal       boolean not null default false,
  sales_count       integer not null default 0 check (sales_count >= 0), -- число заказов с товаром (популярность)
  rating_avg        numeric(3,2) not null default 0,
  rating_count      integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx   on public.products (is_active, created_at desc);
create index products_sales_idx    on public.products (sales_count desc);
create index products_name_trgm    on public.products using gin (name extensions.gin_trgm_ops);

-- ---------- 4. product_images ---------------------------------------------
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  url          text not null,
  storage_path text,
  alt          text,
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------- 12. inventory --------------------------------------------------
create table public.inventory (
  product_id uuid primary key references public.products (id) on delete cascade,
  quantity   numeric(12,3) not null default 0 check (quantity >= 0),  -- защита от отрицательных остатков
  avg_cost   numeric(12,4) not null default 0 check (avg_cost >= 0),  -- средневзвешенная себестоимость
  updated_at timestamptz not null default now()
);

-- ---------- 14. suppliers --------------------------------------------------
create table public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  address    text,
  note       text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 17. promo_codes -----------------------------------------------
create table public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code = upper(code)),
  description     text,
  discount_type   public.discount_type not null,
  discount_value  numeric(12,2) not null check (discount_value > 0),
  min_order_total numeric(12,2) not null default 0,
  max_discount    numeric(12,2),
  usage_limit     integer,
  per_user_limit  integer,
  used_count      integer not null default 0 check (used_count >= 0),
  starts_at       timestamptz,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);

-- ---------- 18. delivery_zones --------------------------------------------
create table public.delivery_zones (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  delivery_fee       numeric(12,2) not null default 0 check (delivery_fee >= 0),
  free_delivery_from numeric(12,2),
  min_order_total    numeric(12,2) not null default 0,
  estimated_minutes  integer,
  sort_order         integer not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- 8. addresses ---------------------------------------------------
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  label      text not null default 'Дом',
  city       text not null default 'Душанбе',
  street     text not null,
  house      text,
  apartment  text,
  entrance   text,
  floor      text,
  note       text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------- 9. orders ------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default public.generate_order_number(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  status           public.order_status not null default 'pending',
  delivery_type    public.delivery_type not null,
  payment_method   public.payment_method not null,
  payment_status   public.payment_status not null default 'unpaid',
  payment_provider text,       -- задел под онлайн-оплату
  payment_reference text,      -- задел под онлайн-оплату
  customer_name    text not null,
  customer_phone   text not null,
  delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  address_id       uuid references public.addresses (id) on delete set null,
  delivery_address text,       -- снимок адреса на момент заказа
  delivery_date    date,
  delivery_time_slot text,
  comment          text,
  subtotal         numeric(12,2) not null default 0 check (subtotal >= 0),
  promo_code_id    uuid references public.promo_codes (id) on delete set null,
  promo_discount   numeric(12,2) not null default 0 check (promo_discount >= 0),
  delivery_fee     numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total            numeric(12,2) not null default 0 check (total >= 0),
  courier_name     text,
  courier_phone    text,
  handled_by       uuid references public.profiles (id) on delete set null,
  idempotency_key  text,
  cancel_reason    text,
  cancelled_at     timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, idempotency_key)  -- защита от повторного оформления
);
create index orders_user_idx    on public.orders (user_id, created_at desc);
create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

-- ---------- 10. order_items -----------------------------------------------
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,             -- снимок названия
  unit         public.product_unit not null,
  quantity     numeric(12,3) not null check (quantity > 0),
  unit_price   numeric(12,2) not null check (unit_price >= 0),   -- цена на момент заказа
  unit_cost    numeric(12,4) not null default 0 check (unit_cost >= 0), -- себестоимость на момент заказа
  line_total   numeric(12,2) not null check (line_total >= 0),
  created_at   timestamptz not null default now()
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ---------- 11. order_status_history --------------------------------------
create table public.order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  note       text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------- order_returns (возвраты) --------------------------------------
create table public.order_returns (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  quantity      numeric(12,3) not null check (quantity > 0),
  refund_amount numeric(12,2) not null check (refund_amount >= 0),
  unit_cost     numeric(12,4) not null default 0,
  restocked     boolean not null,
  reason        text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index order_returns_order_idx on public.order_returns (order_id);

-- ---------- 13. inventory_transactions ------------------------------------
create table public.inventory_transactions (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete restrict,
  type            public.inventory_tx_type not null,
  quantity_change numeric(12,3) not null check (quantity_change <> 0),  -- со знаком
  quantity_before numeric(12,3) not null,
  quantity_after  numeric(12,3) not null check (quantity_after >= 0),
  unit_cost       numeric(12,4) not null default 0,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  order_id        uuid references public.orders (id) on delete set null,
  document_number text,
  reason          text,
  comment         text,
  occurred_at     timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index inv_tx_product_idx on public.inventory_transactions (product_id, occurred_at desc);
create index inv_tx_type_idx    on public.inventory_transactions (type, occurred_at desc);
create index inv_tx_order_idx   on public.inventory_transactions (order_id);

-- Защита от двойного списания / двойного возврата остатка по одному заказу
create unique index inv_tx_order_once
  on public.inventory_transactions (order_id, product_id, type)
  where order_id is not null and type in ('sale', 'sale_cancel');

-- Защита от повторного ввода одного и того же приходного документа
create unique index inv_tx_purchase_doc_once
  on public.inventory_transactions (
    coalesce(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_number, product_id
  )
  where type = 'purchase' and document_number is not null;

-- ---------- 5. product_reviews --------------------------------------------
create table public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  photo_url  text,
  status     public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index product_reviews_product_idx on public.product_reviews (product_id, status);
create index product_reviews_status_idx  on public.product_reviews (status, created_at desc);

-- ---------- 6. favorites ---------------------------------------------------
create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- 7. cart_items --------------------------------------------------
create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- 15. expenses ---------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  category     text not null default 'other',  -- rent, salary, fuel, marketing, utilities, other
  amount       numeric(12,2) not null check (amount > 0),
  description  text,
  expense_date date not null default current_date,
  is_voided    boolean not null default false,  -- удаление запрещено, только аннулирование
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (expense_date desc);

-- ---------- 16. promotions -------------------------------------------------
-- Акция действует на товар, категорию или (если оба поля пусты) на весь ассортимент.
create table public.promotions (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  discount_type  public.discount_type not null,
  discount_value numeric(12,2) not null check (discount_value > 0),
  product_id     uuid references public.products (id) on delete cascade,
  category_id    uuid references public.categories (id) on delete cascade,
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);
create index promotions_active_idx on public.promotions (is_active, starts_at, ends_at);

-- ---------- banners (баннеры главной) -------------------------------------
create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subtitle   text,
  image_url  text,
  link_url   text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 19. notifications --------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------- 20. audit_logs -------------------------------------------------
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  text,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  actor_id   uuid,
  created_at timestamptz not null default now()
);
create index audit_logs_table_idx on public.audit_logs (table_name, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- ---------- 21. store_settings --------------------------------------------
create table public.store_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  is_public   boolean not null default false,
  updated_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
