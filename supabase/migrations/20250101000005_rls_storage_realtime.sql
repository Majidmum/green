-- ============================================================================
-- GREEN GARDEN — 005: Row Level Security, представления, Storage, Realtime
-- ============================================================================
-- Принцип: по умолчанию всё закрыто. Заказы, склад, журналы и уведомления
-- записываются только через RPC (security definer); у клиента нет права
-- INSERT/UPDATE/DELETE на эти таблицы даже при ошибке в политике.
-- ============================================================================

-- ---------- Публичные представления ---------------------------------------
-- Витрина: выполняется от имени владельца, показывает только активные товары
-- и остаток (закупочные цены и журнал склада остаются закрытыми).
create view public.product_catalog as
select
  x.*,
  case when x.old_price is not null and x.old_price > x.price
       then round((x.old_price - x.price) / x.old_price * 100) else 0 end as discount_percent
from (
  select
    p.id, p.name, p.slug, p.description,
    p.category_id, c.name as category_name, c.slug as category_slug,
    p.unit, p.step, p.country_of_origin,
    p.is_featured, p.is_new, p.is_seasonal,
    p.sales_count, p.rating_avg, p.rating_count, p.created_at,
    e.price,
    p.price as base_price,
    case when e.price < p.price then p.price else p.old_price end as old_price,
    coalesce(i.quantity, 0) as stock,
    (select pi.url from public.product_images pi
      where pi.product_id = p.id
      order by pi.is_primary desc, pi.sort_order, pi.created_at limit 1) as image_url
  from public.products p
  join public.categories c on c.id = p.category_id and c.is_active
  left join public.inventory i on i.product_id = p.id
  cross join lateral (select public.product_effective_price(p.id) as price) e
  where p.is_active
) x;

-- Одобренные отзывы с именем автора (только имя, без телефона/почты)
create view public.public_reviews as
select
  r.id, r.product_id, p.name as product_name, p.slug as product_slug,
  r.rating, r.body, r.photo_url, r.created_at,
  coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'Покупатель') as author_name
from public.product_reviews r
join public.products p  on p.id = r.product_id and p.is_active
join public.profiles pr on pr.id = r.user_id
where r.status = 'approved';

-- ---------- Включаем RLS ---------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- profiles -------------------------------------------------------
create policy profiles_select_own   on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_staff on public.profiles for select to authenticated
  using ((select public.is_staff()));
create policy profiles_update_own   on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active);

-- ---------- Каталог --------------------------------------------------------
create policy categories_select_public on public.categories for select to anon, authenticated
  using (is_active);
create policy categories_select_staff  on public.categories for select to authenticated
  using ((select public.is_staff()));
create policy categories_admin_write   on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy products_select_public on public.products for select to anon, authenticated
  using (is_active);
create policy products_select_staff  on public.products for select to authenticated
  using ((select public.is_staff()));
create policy products_admin_write   on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_images_select_public on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy product_images_select_staff  on public.product_images for select to authenticated
  using ((select public.is_staff()));
create policy product_images_admin_write   on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Отзывы ---------------------------------------------------------
create policy reviews_select_approved on public.product_reviews for select to authenticated
  using (status = 'approved');
create policy reviews_select_own      on public.product_reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy reviews_select_staff    on public.product_reviews for select to authenticated
  using ((select public.is_staff()));
-- Писать отзыв может только реальный покупатель (доставленный заказ)
create policy reviews_insert_buyer    on public.product_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user())
              and public.has_purchased(product_id));
create policy reviews_update_own      on public.product_reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy reviews_delete_own      on public.product_reviews for delete to authenticated
  using (user_id = (select auth.uid()));
create policy reviews_admin_moderate  on public.product_reviews for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy reviews_admin_delete    on public.product_reviews for delete to authenticated
  using ((select public.is_admin()));

-- ---------- Личные данные покупателя --------------------------------------
-- Заблокированный пользователь (is_active = false) не может добавлять и менять данные.
-- Полную блокировку входа выполняет серверный код через Auth Admin API (ban_duration).
create policy favorites_own  on public.favorites  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy cart_items_own on public.cart_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy addresses_own  on public.addresses  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy addresses_select_staff on public.addresses for select to authenticated
  using ((select public.is_staff()));

-- ---------- Заказы (только чтение; запись — через RPC) --------------------
create policy orders_select_own   on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy orders_select_staff on public.orders for select to authenticated
  using ((select public.is_staff()));

create policy order_items_select_own on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_items_select_staff on public.order_items for select to authenticated
  using ((select public.is_staff()));

create policy order_history_select_own on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_history_select_staff on public.order_status_history for select to authenticated
  using ((select public.is_staff()));

create policy order_returns_select_own on public.order_returns for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_returns_select_staff on public.order_returns for select to authenticated
  using ((select public.is_staff()));

-- ---------- Склад (чтение для сотрудников; запись — только RPC) -----------
create policy inventory_select_staff on public.inventory for select to authenticated
  using ((select public.is_staff()));
create policy inv_tx_select_staff on public.inventory_transactions for select to authenticated
  using ((select public.is_staff()));

create policy suppliers_select_staff on public.suppliers for select to authenticated
  using ((select public.is_staff()));
create policy suppliers_admin_write  on public.suppliers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Финансы --------------------------------------------------------
create policy expenses_select_staff on public.expenses for select to authenticated
  using ((select public.is_staff()));
-- Администратор может добавлять и править (изменения попадают в audit_logs);
-- удаление запрещено — расход аннулируется флагом is_voided.
create policy expenses_admin_insert on public.expenses for insert to authenticated
  with check ((select public.is_admin()));
create policy expenses_admin_update on public.expenses for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Акции, промокоды, баннеры, доставка ---------------------------
create policy promotions_select_public on public.promotions for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy promotions_select_staff  on public.promotions for select to authenticated
  using ((select public.is_staff()));
create policy promotions_admin_write   on public.promotions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Промокоды клиентам не видны (нельзя перебрать список); проверка — через RPC
create policy promo_codes_select_staff on public.promo_codes for select to authenticated
  using ((select public.is_staff()));
create policy promo_codes_admin_write  on public.promo_codes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy banners_select_public on public.banners for select to anon, authenticated
  using (is_active);
create policy banners_select_staff  on public.banners for select to authenticated
  using ((select public.is_staff()));
create policy banners_admin_write   on public.banners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy delivery_zones_select_public on public.delivery_zones for select to anon, authenticated
  using (is_active);
create policy delivery_zones_select_staff  on public.delivery_zones for select to authenticated
  using ((select public.is_staff()));
create policy delivery_zones_admin_write   on public.delivery_zones for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Уведомления ----------------------------------------------------
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Журнал действий и настройки -----------------------------------
create policy audit_logs_select_staff on public.audit_logs for select to authenticated
  using ((select public.is_staff()));

create policy settings_select_public on public.store_settings for select to anon, authenticated
  using (is_public);
create policy settings_select_staff  on public.store_settings for select to authenticated
  using ((select public.is_staff()));
create policy settings_admin_write   on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Права на уровне таблиц (второй рубеж обороны) -----------------
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

grant select on
  public.categories, public.products, public.product_images,
  public.promotions, public.banners, public.delivery_zones, public.store_settings,
  public.product_catalog, public.public_reviews
to anon;
grant select on public.product_catalog, public.public_reviews to authenticated;

-- Только через RPC: клиентский токен не может писать в эти таблицы напрямую
revoke insert, update, delete on
  public.orders, public.order_items, public.order_status_history, public.order_returns,
  public.inventory, public.inventory_transactions, public.audit_logs
from authenticated;
revoke insert on public.notifications from authenticated;

-- Профиль: клиент меняет только имя, телефон и аватар (роль — только через RPC/SQL)
revoke insert, delete, update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- Уведомления: клиент может менять только флаг «прочитано»
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Отзыв: менять можно текст, оценку и фото
revoke update on public.product_reviews from authenticated;
grant update (rating, body, photo_url, status) on public.product_reviews to authenticated;
-- (status попадает под guard_review: не-администратор всегда получает 'pending')

-- ---------- Storage --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('review-photos',  'review-photos',  true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('banners',        'banners',        true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Изображения товаров и баннеры: загружает/удаляет только администратор
create policy storage_admin_images_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'banners') and (select public.is_admin()));
create policy storage_admin_images_update on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'banners') and (select public.is_admin()));
create policy storage_admin_images_delete on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'banners') and (select public.is_admin()));

-- Фото отзывов: каждый пользователь работает только в своей папке {user_id}/...
create policy storage_review_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_review_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'review-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_review_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- ---------- Realtime -------------------------------------------------------
-- Realtime учитывает RLS: клиент получает события только по своим заказам и уведомлениям.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.notifications,
      public.order_status_history;
  end if;
end $$;
