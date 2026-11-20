-- ============================================================================
-- GREEN GARDEN — seed.sql (ТЕСТОВЫЕ ДАННЫЕ)
-- ============================================================================
-- Цены, остатки, зоны и тарифы доставки — демонстрационные, замените своими.
-- Запускать в SQL Editor Supabase ПОСЛЕ всех миграций. Скрипт можно запускать
-- повторно: существующие записи не дублируются, приход SEED-001 не повторяется.
-- Остатки заводятся приходом через журнал склада (а не прямой записью в inventory).
-- ============================================================================

-- ---------- Категории ------------------------------------------------------
insert into public.categories (name, slug, description, sort_order) values
  ('Фрукты',             'fruits',    'Свежие сезонные фрукты',            10),
  ('Овощи',              'vegetables','Овощи с местных ферм',               20),
  ('Ягоды',              'berries',   'Свежие ягоды',                       30),
  ('Зелень',             'greens',    'Свежая зелень и салатные листья',    40),
  ('Сухофрукты',         'dried-fruits','Курага, изюм, инжир и другие',     50),
  ('Орехи',              'nuts',      'Орехи и миндаль',                    60),
  ('Цитрусовые',         'citrus',    'Апельсины, мандарины, лимоны',       70),
  ('Экзотические фрукты','exotic',    'Манго, авокадо, киви и другие',      80)
on conflict (slug) do nothing;

-- Подкатегории (пример): цитрусовые и экзотика — внутри «Фрукты»
update public.categories set parent_id = (select id from public.categories where slug = 'fruits')
where slug in ('citrus', 'exotic') and parent_id is null;

-- ---------- Поставщик ------------------------------------------------------
insert into public.suppliers (name, note)
select 'Тестовый поставщик', 'Демонстрационная запись — замените реальным поставщиком'
where not exists (select 1 from public.suppliers where name = 'Тестовый поставщик');

-- ---------- Товары ---------------------------------------------------------
create temp table _seed_products (
  slug text, name text, cat text, price numeric, old_price numeric, unit public.product_unit,
  step numeric, min_stock numeric, country text, descr text,
  featured boolean, is_new boolean, seasonal boolean, qty numeric, cost numeric
) on commit drop;

insert into _seed_products values
 ('yabloki-golden',  'Яблоки Голден',        'fruits',    18.00, 22.00, 'kg', 0.5, 20, 'Таджикистан', 'Сладкие сочные яблоки',                true,  false, true,  120, 11.00),
 ('grushi',          'Груши',                'fruits',    24.00, null,  'kg', 0.5, 15, 'Таджикистан', 'Мягкие ароматные груши',                false, false, true,   80, 15.00),
 ('vinograd',        'Виноград Хусайни',     'fruits',    32.00, 38.00, 'kg', 0.5, 15, 'Таджикистан', 'Классический душанбинский виноград',    true,  false, true,   70, 20.00),
 ('granat',          'Гранат',               'fruits',    28.00, null,  'kg', 0.5, 10, 'Таджикистан', 'Спелый гранат',                         false, false, true,   60, 17.00),
 ('abrikos',         'Абрикосы',             'fruits',    30.00, null,  'kg', 0.5, 10, 'Таджикистан', 'Свежие абрикосы',                       false, true,  true,   40, 19.00),
 ('persik',          'Персики',              'fruits',    26.00, null,  'kg', 0.5, 10, 'Таджикистан', 'Сочные персики',                        false, false, true,   45, 16.00),
 ('pomidory',        'Помидоры',             'vegetables',16.00, null,  'kg', 0.5, 25, 'Таджикистан', 'Спелые помидоры',                       true,  false, false, 150,  9.00),
 ('ogurcy',          'Огурцы',               'vegetables',14.00, null,  'kg', 0.5, 25, 'Таджикистан', 'Хрустящие огурцы',                      false, false, false, 130,  8.00),
 ('kartofel',        'Картофель',            'vegetables', 8.00, null,  'kg', 1,   50, 'Таджикистан', 'Картофель для варки и жарки',          false, false, false, 400,  4.50),
 ('luk',             'Лук репчатый',         'vegetables', 6.00, null,  'kg', 1,   40, 'Таджикистан', 'Репчатый лук',                          false, false, false, 300,  3.50),
 ('morkov',          'Морковь',              'vegetables', 7.00, null,  'kg', 0.5, 40, 'Таджикистан', 'Сладкая морковь',                       false, false, false, 250,  4.00),
 ('perec',           'Болгарский перец',     'vegetables',22.00, 26.00, 'kg', 0.5, 15, 'Таджикистан', 'Сладкий перец',                         false, false, false,  60, 14.00),
 ('klubnika',        'Клубника',             'berries',   55.00, null,  'kg', 0.5, 8,  'Таджикистан', 'Свежая клубника',                       true,  true,  true,   25, 36.00),
 ('malina',          'Малина',               'berries',   85.00, null,  'kg', 0.5, 3,   'Таджикистан', 'Свежая малина',                        false, false, true,   12,  55.00),
 ('chernika',        'Черника',              'berries',  120.00, null,  'pack',1, 5,   'Польша',      'Черника в упаковке 125 г',             false, true,  false,  30,  80.00),
 ('ukrop',           'Укроп',                'greens',     3.00, null,  'pack',1, 20,  'Таджикистан', 'Пучок свежего укропа',                 false, false, false,  80,   1.50),
 ('petrushka',       'Петрушка',             'greens',     3.00, null,  'pack',1, 20,  'Таджикистан', 'Пучок свежей петрушки',                false, false, false,  80,   1.50),
 ('kinza',           'Кинза',                'greens',     3.00, null,  'pack',1, 20,  'Таджикистан', 'Пучок свежей кинзы',                   false, false, false,  70,   1.50),
 ('kuraga',          'Курага',               'dried-fruits',65.00,null, 'kg', 0.5, 10, 'Таджикистан', 'Сушёные абрикосы без косточек',        true,  false, false,  50,  42.00),
 ('izyum',           'Изюм',                 'dried-fruits',48.00,null, 'kg', 0.5, 10, 'Таджикистан', 'Тёмный изюм без косточек',             false, false, false,  50,  30.00),
 ('gretskiy-orekh',  'Грецкий орех',         'nuts',      70.00, null,  'kg', 0.5, 10, 'Таджикистан', 'Очищенный грецкий орех',               false, false, false,  40,  48.00),
 ('mindal',          'Миндаль',              'nuts',      95.00, null,  'kg', 0.5, 8,  'Таджикистан', 'Сушёный миндаль',                       false, true,  false,  30,  66.00),
 ('apelsiny',        'Апельсины',            'citrus',    20.00, 24.00, 'kg', 0.5, 20, 'Египет',      'Сладкие апельсины',                    true,  false, false, 100,  13.00),
 ('mandariny',       'Мандарины',            'citrus',    22.00, null,  'kg', 0.5, 20, 'Турция',      'Ароматные мандарины',                  false, false, true,   90,  14.00),
 ('limony',          'Лимоны',               'citrus',    18.00, null,  'kg', 0.5, 15, 'Турция',      'Свежие лимоны',                        false, false, false,  60,  11.00),
 ('banany',          'Бананы',               'exotic',    19.00, null,  'kg', 0.5, 20, 'Эквадор',     'Спелые бананы',                        true,  false, false, 110,  12.00),
 ('avokado',         'Авокадо',              'exotic',    18.00, null,  'pcs',1,   15, 'Перу',        'Спелое авокадо',                       false, true,  false,  60,  10.00),
 ('kivi',            'Киви',                 'exotic',     9.00, null,  'pcs',1,   20, 'Греция',      'Сочное киви',                          false, false, false,  90,   5.00);

insert into public.products (
  category_id, name, slug, description, price, old_price, unit, step, min_stock,
  country_of_origin, is_featured, is_new, is_seasonal
)
select c.id, s.name, s.slug, s.descr, s.price, s.old_price, s.unit, s.step, s.min_stock,
       s.country, s.featured, s.is_new, s.seasonal
from _seed_products s
join public.categories c on c.slug = s.cat
on conflict (slug) do nothing;

-- Начальный приход одним документом (через журнал склада)
do $$
declare
  r record;
  v_supplier uuid := (select id from public.suppliers where name = 'Тестовый поставщик' limit 1);
begin
  for r in
    select p.id as pid, s.qty, s.cost
    from _seed_products s
    join public.products p on p.slug = s.slug
    where not exists (
      select 1 from public.inventory_transactions t
      where t.product_id = p.id and t.type = 'purchase' and t.document_number = 'SEED-001'
    )
    order by p.id
  loop
    perform public._inv_move(r.pid, 'purchase', r.qty, r.cost, null, v_supplier,
                             'SEED-001', null, 'Начальный остаток (тестовые данные)', now());
  end loop;
end $$;

-- ---------- Зоны доставки (районы Душанбе; тарифы тестовые) ----------------
insert into public.delivery_zones (name, delivery_fee, free_delivery_from, min_order_total, estimated_minutes, sort_order)
select v.* from (values
  ('Исмоили Сомони', 10.00, 150.00, 30.00, 60, 10),
  ('Сино',           10.00, 150.00, 30.00, 60, 20),
  ('Фирдавси',       10.00, 150.00, 30.00, 60, 30),
  ('Шохмансур',      10.00, 150.00, 30.00, 60, 40)
) as v(name, fee, free_from, min_total, minutes, sort_order)
where not exists (select 1 from public.delivery_zones);

-- ---------- Промокод и акция (примеры) -------------------------------------
insert into public.promo_codes (code, description, discount_type, discount_value, min_order_total, per_user_limit)
values ('WELCOME10', 'Скидка 10% на первый заказ (тест)', 'percent', 10, 50, 1)
on conflict (code) do nothing;

insert into public.promotions (name, description, discount_type, discount_value, category_id)
select 'Ягодная неделя', 'Скидка 15% на все ягоды (тест)', 'percent', 15, id
from public.categories c
where c.slug = 'berries'
  and not exists (select 1 from public.promotions where name = 'Ягодная неделя');

-- ---------- Настройки и юридические страницы --------------------------------
-- Реквизиты и условия НЕ придуманы: заполните и согласуйте с юристом.
insert into public.store_settings (key, value, description, is_public) values
  ('store_info', jsonb_build_object(
      'name', 'Green Garden', 'phone', '', 'whatsapp', '', 'telegram', '', 'email', '',
      'address', '', 'working_hours', '', 'city', 'Душанбе'),
   'Контакты магазина (заполните)', true),
  ('page:offer', jsonb_build_object(
      'title', 'Публичная оферта',
      'body', E'[ТЕКСТ ОФЕРТЫ — заполнить и согласовать с юристом]\n\nПродавец: [НАИМЕНОВАНИЕ ЮРИДИЧЕСКОГО ЛИЦА / ИП]\nИНН: [ЗАПОЛНИТЬ]\nАдрес: [ЗАПОЛНИТЬ]'),
   'Юридическая страница /offer', true),
  ('page:privacy-policy', jsonb_build_object(
      'title', 'Политика конфиденциальности',
      'body', E'[ТЕКСТ ПОЛИТИКИ — заполнить и согласовать с юристом]\n\nОператор персональных данных: [ЗАПОЛНИТЬ]'),
   'Юридическая страница /privacy-policy', true),
  ('page:terms', jsonb_build_object(
      'title', 'Условия использования',
      'body', E'[УСЛОВИЯ ИСПОЛЬЗОВАНИЯ — заполнить и согласовать с юристом]'),
   'Юридическая страница /terms', true),
  ('page:delivery', jsonb_build_object(
      'title', 'Условия доставки и оплаты',
      'body', E'[УСЛОВИЯ ДОСТАВКИ И ОПЛАТЫ — заполнить: сроки, зоны, стоимость, возврат]'),
   'Юридическая страница /delivery', true),
  ('time_slots', jsonb_build_array('09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'),
   'Интервалы доставки', true)
on conflict (key) do nothing;
