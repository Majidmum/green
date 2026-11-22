-- =====================================================================
-- Главная: публичная статистика и фото для акций
-- =====================================================================
alter table public.promotions add column if not exists image_url text;

-- Публичные цифры для главной. Только агрегаты, персональных данных нет.
-- security definer: анонимный посетитель не имеет доступа к заказам напрямую.
create or replace function public.public_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'products',   (select count(*) from public.products where is_active),
    'categories', (select count(*) from public.categories where is_active and parent_id is null),
    'zones',      (select count(*) from public.delivery_zones where is_active),
    'customers',  (select count(distinct user_id) from public.orders where status = 'delivered')
  );
$$;

revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
