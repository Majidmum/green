-- ============================================================================
-- GREEN GARDEN — 002: вспомогательные функции и триггеры
-- ============================================================================

-- ---------- Определение роли (используется в RLS и RPC) --------------------
create function public.app_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() = 'admin', false); $$;

create function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() = 'manager', false); $$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() in ('admin', 'manager'), false); $$;

-- Активен ли текущий пользователь (заблокированный не может изменять данные)
create function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

-- ---------- updated_at -----------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','products','suppliers','promo_codes','delivery_zones',
    'addresses','orders','cart_items','expenses','promotions','banners',
    'product_reviews','store_settings','inventory'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

-- ---------- Неизменяемые журналы ------------------------------------------
create function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Таблица % — журнал только для добавления записей (% запрещён)',
    tg_table_name, tg_op using errcode = '42501';
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'inventory_transactions','audit_logs','order_status_history','order_returns'
  ] loop
    execute format(
      'create trigger %I before update or delete on public.%I
         for each row execute function public.forbid_mutation()',
      t || '_immutable', t);
  end loop;
end $$;

-- ---------- Уведомления ----------------------------------------------------
create function public.notify_user(
  p_user uuid, p_type text, p_title text, p_body text default null,
  p_data jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
$$;

-- Рассылка сотрудникам: по одной записи на каждого, у каждого своё состояние «прочитано».
create function public.notify_staff(
  p_type text, p_title text, p_body text default null,
  p_data jsonb default '{}'::jsonb, p_include_managers boolean default true
) returns void
language sql security definer set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, data)
  select id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb)
  from public.profiles
  where is_active and (role = 'admin' or (p_include_managers and role = 'manager'));
$$;

-- ---------- Аудит ----------------------------------------------------------
create function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_row jsonb;
begin
  v_row := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, actor_id)
  values (
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key'),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'expenses','suppliers','promo_codes','promotions','store_settings','delivery_zones'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()',
      t || '_audit', t);
  end loop;
end $$;

-- Товары: журналируем создание, удаление и изменение цены/активности (не счётчики продаж)
create trigger products_audit_iud after insert or delete on public.products
  for each row execute function public.audit_row();
create trigger products_audit_upd after update on public.products
  for each row
  when (old.price is distinct from new.price
     or old.old_price is distinct from new.old_price
     or old.is_active is distinct from new.is_active)
  execute function public.audit_row();

-- Профили: журналируем смену роли и блокировку
create trigger profiles_audit_upd after update on public.profiles
  for each row
  when (old.role is distinct from new.role or old.is_active is distinct from new.is_active)
  execute function public.audit_row();

-- ---------- Профиль при регистрации ---------------------------------------
-- Роль всегда customer: данные из raw_user_meta_data для роли НЕ используются.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    'customer'
  )
  on conflict (id) do nothing;

  perform public.notify_staff(
    'new_user', 'Новая регистрация',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    jsonb_build_object('user_id', new.id), false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Защита от повышения прав. Прямой SQL (SQL Editor / service role) разрешён —
-- так создаётся первый администратор.
create function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.id is distinct from old.id then
      raise exception 'Недостаточно прав для изменения роли или статуса' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------- Строка склада для нового товара --------------------------------
create function public.create_inventory_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.inventory (product_id, quantity, avg_cost)
  values (new.id, 0, 0) on conflict do nothing;
  return new;
end;
$$;

create trigger products_create_inventory after insert on public.products
  for each row execute function public.create_inventory_row();

-- ---------- Низкий остаток -------------------------------------------------
create function public.notify_low_stock()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_name text; v_min numeric;
begin
  select name, min_stock into v_name, v_min from public.products where id = new.product_id;
  if new.quantity <= coalesce(v_min, 0) and old.quantity > coalesce(v_min, 0) then
    perform public.notify_staff(
      'low_stock',
      case when new.quantity = 0 then 'Товар закончился' else 'Низкий остаток' end,
      format('%s: осталось %s', v_name, new.quantity),
      jsonb_build_object('product_id', new.product_id)
    );
  end if;
  return new;
end;
$$;

create trigger inventory_low_stock after update of quantity on public.inventory
  for each row execute function public.notify_low_stock();

-- ---------- История статусов заказа ---------------------------------------
-- Комментарий передаётся из RPC через set_config('gg.note', ..., true).
create function public.log_order_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_note text := nullif(current_setting('gg.note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (new.id, new.status, 'Заказ создан', auth.uid());
  elsif new.status is distinct from old.status
     or new.courier_name is distinct from old.courier_name then
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (
      new.id, new.status,
      coalesce(v_note,
        case when new.courier_name is distinct from old.courier_name
             then 'Назначен курьер: ' || coalesce(new.courier_name, '—') end),
      auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger orders_status_history_ins after insert on public.orders
  for each row execute function public.log_order_status();
create trigger orders_status_history_upd after update on public.orders
  for each row execute function public.log_order_status();

-- ---------- Отзывы ---------------------------------------------------------
-- Покупал ли текущий пользователь этот товар (доставленный заказ)
create function public.has_purchased(p_product_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = auth.uid()
      and o.status = 'delivered'
      and oi.product_id = p_product_id
  );
$$;

-- Не-админ не может сам одобрить отзыв; правка отзыва возвращает его на модерацию.
create function public.guard_review()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id    := old.user_id;
    new.product_id := old.product_id;
  end if;
  if not public.is_admin() then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger product_reviews_guard before insert or update on public.product_reviews
  for each row execute function public.guard_review();

create function public.refresh_product_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_pid uuid;
begin
  for v_pid in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT','UPDATE') then new.product_id end,
      case when tg_op in ('UPDATE','DELETE') then old.product_id end
    ]) as x where x is not null
  loop
    update public.products p set
      rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.product_reviews
                               where product_id = v_pid and status = 'approved'), 0),
      rating_count = (select count(*) from public.product_reviews
                      where product_id = v_pid and status = 'approved')
    where p.id = v_pid;
  end loop;
  return null;
end;
$$;

create trigger product_reviews_rating after insert or update or delete on public.product_reviews
  for each row execute function public.refresh_product_rating();

create function public.notify_new_review()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_staff(
    'new_review', 'Новый отзыв на модерации',
    format('Оценка: %s', new.rating),
    jsonb_build_object('review_id', new.id, 'product_id', new.product_id), false
  );
  return null;
end;
$$;

create trigger product_reviews_notify after insert on public.product_reviews
  for each row execute function public.notify_new_review();

-- ---------- Внутренние функции недоступны клиентам -------------------------
revoke all on function public.notify_user(uuid, text, text, text, jsonb)          from public, anon, authenticated;
revoke all on function public.notify_staff(text, text, text, jsonb, boolean)      from public, anon, authenticated;
