-- =====================================================================
-- Блоки «Сервисы» на главной: фото + текст, управляются из админки
-- =====================================================================
create table public.home_services (
  id          uuid primary key default gen_random_uuid(),
  tag         text,
  title       text not null,
  description text,
  image_url   text,
  link_url    text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger home_services_set_updated_at before update on public.home_services
  for each row execute function public.set_updated_at();
create trigger home_services_audit after insert or update or delete on public.home_services
  for each row execute function public.audit_row();

alter table public.home_services enable row level security;

create policy home_services_select_public on public.home_services for select to anon, authenticated
  using (is_active);
create policy home_services_select_staff on public.home_services for select to authenticated
  using ((select public.is_staff()));
create policy home_services_admin_write on public.home_services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.home_services from anon;
grant select on public.home_services to anon;
grant select, insert, update, delete on public.home_services to authenticated;

-- Стартовые тексты (без фото): фото загружаются в админке «Маркетинг → Блоки сервисов»
insert into public.home_services (tag, title, description, link_url, sort_order)
select * from (values
  ('Онлайн-магазин', 'Каталог товаров', 'Фрукты, овощи, ягоды, зелень и орехи с актуальными ценами и остатками.', '/catalog', 10),
  ('Доставка', 'Доставка по Душанбе', 'Курьер привезёт заказ по вашему адресу. Зоны и стоимость — в условиях доставки.', '/delivery', 20),
  ('Самовывоз', 'Заберите сами', 'Оформите заказ онлайн и заберите его в удобное время.', '/delivery', 30),
  ('Акции', 'Скидки и предложения', 'Товары со скидкой и специальные предложения магазина.', '/catalog?sale=1', 40),
  ('Личный кабинет', 'Заказы и адреса', 'История заказов, статус в реальном времени, адреса и избранное.', '/profile', 50),
  ('О компании', 'О Green Garden', 'Кто мы, как отбираем продукцию и почему нам доверяют.', '/about', 60)
) as v(tag, title, description, link_url, sort_order)
where not exists (select 1 from public.home_services);
