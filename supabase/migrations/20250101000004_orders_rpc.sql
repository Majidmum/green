-- ============================================================================
-- GREEN GARDEN — 004: цены, промокоды, заказы (атомарные RPC)
-- ============================================================================
-- Клиент НЕ вставляет заказы напрямую: цены, остатки, промокод и доставка
-- пересчитываются на сервере внутри одной транзакции.
-- ============================================================================

-- ---------- Итоговая цена товара с учётом активных акций ------------------
create function public.product_effective_price(p_product_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select round(greatest(
    p.price - coalesce((
      select max(case pr.discount_type
                   when 'percent' then p.price * pr.discount_value / 100
                   else pr.discount_value end)
      from public.promotions pr
      where pr.is_active
        and (pr.starts_at is null or pr.starts_at <= now())
        and (pr.ends_at   is null or pr.ends_at   >  now())
        and (pr.product_id = p.id
             or pr.category_id = p.category_id
             or (pr.product_id is null and pr.category_id is null))
    ), 0),
    0), 2)
  from public.products p
  where p.id = p_product_id;
$$;

-- ---------- Проверка промокода --------------------------------------------
create function public._promo_check(p_code text, p_user uuid, p_subtotal numeric)
returns table (promo_id uuid, discount numeric, error text)
language plpgsql stable security definer set search_path = public
as $$
declare
  c public.promo_codes%rowtype;
  v_used_by_user integer;
  v_disc numeric;
begin
  select * into c from public.promo_codes
  where code = upper(trim(p_code));

  if not found or not c.is_active then
    return query select null::uuid, 0::numeric, 'Промокод не найден'::text; return;
  end if;
  if (c.starts_at is not null and c.starts_at > now())
     or (c.expires_at is not null and c.expires_at <= now()) then
    return query select null::uuid, 0::numeric, 'Срок действия промокода истёк'::text; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select null::uuid, 0::numeric, 'Промокод больше недоступен'::text; return;
  end if;
  if p_subtotal < c.min_order_total then
    return query select null::uuid, 0::numeric,
      format('Минимальная сумма заказа для промокода: %s сом.', c.min_order_total); return;
  end if;
  if c.per_user_limit is not null then
    select count(*) into v_used_by_user
    from public.orders
    where user_id = p_user and promo_code_id = c.id and status <> 'cancelled';
    if v_used_by_user >= c.per_user_limit then
      return query select null::uuid, 0::numeric, 'Вы уже использовали этот промокод'::text; return;
    end if;
  end if;

  v_disc := case c.discount_type
              when 'percent' then p_subtotal * c.discount_value / 100
              else c.discount_value end;
  if c.max_discount is not null then v_disc := least(v_disc, c.max_discount); end if;
  v_disc := round(least(v_disc, p_subtotal), 2);

  return query select c.id, v_disc, null::text;
end;
$$;

-- Публичная обёртка для корзины: показать скидку до оформления
create function public.validate_promo_code(p_code text, p_subtotal numeric)
returns table (promo_id uuid, discount numeric, error text)
language sql stable security definer set search_path = public
as $$
  select * from public._promo_check(p_code, auth.uid(), p_subtotal)
  where auth.uid() is not null;
$$;

-- ---------- Возврат остатков по заказу (внутренняя) -----------------------
-- Вызывать только при уже заблокированной строке заказа.
create function public._cancel_order_internal(p_order_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders%rowtype;
  r record;
begin
  select * into o from public.orders where id = p_order_id;

  for r in
    select product_id, quantity, unit_cost from public.order_items
    where order_id = p_order_id and product_id is not null
    order by product_id
  loop
    perform public._inv_move(
      r.product_id, 'sale_cancel', r.quantity, r.unit_cost, p_order_id,
      null, null, 'order_cancelled', p_reason, now()
    );
    update public.products set sales_count = greatest(sales_count - 1, 0)
    where id = r.product_id;
  end loop;

  if o.promo_code_id is not null then
    update public.promo_codes set used_count = greatest(used_count - 1, 0)
    where id = o.promo_code_id;
  end if;

  update public.orders
     set status = 'cancelled', cancelled_at = now(),
         cancel_reason = nullif(p_reason, ''), handled_by = coalesce(auth.uid(), handled_by)
   where id = p_order_id;

  perform public.notify_staff(
    'order_cancelled', 'Заказ отменён',
    o.order_number || coalesce(': ' || nullif(p_reason, ''), ''),
    jsonb_build_object('order_id', p_order_id)
  );
end;
$$;

-- ---------- Создание заказа ------------------------------------------------
-- p: {
--   items: [{product_id, quantity}], delivery_type, payment_method,
--   delivery_zone_id, delivery_address, address_id, delivery_date, delivery_time_slot,
--   comment, promo_code, customer_name, customer_phone, idempotency_key
-- }
create function public.create_order(p jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles%rowtype;
  v_idem      text := nullif(trim(p ->> 'idempotency_key'), '');
  v_existing  public.orders%rowtype;
  v_dtype     public.delivery_type;
  v_pay       public.payment_method;
  v_zone      public.delivery_zones%rowtype;
  v_name      text;
  v_phone     text;
  v_addr      text;
  v_date      date;
  v_today     date := (now() at time zone 'Asia/Dushanbe')::date;
  v_order_id  uuid;
  v_number    text;
  v_subtotal  numeric := 0;
  v_fee       numeric := 0;
  v_promo_id  uuid;
  v_promo_amt numeric := 0;
  v_promo_err text;
  v_total     numeric;
  r           record;
  v_prod      public.products%rowtype;
  v_stock     numeric;
  v_cost      numeric;
  v_price     numeric;
begin
  if v_uid is null then
    raise exception 'Требуется авторизация' using errcode = '28000';
  end if;
  select * into v_profile from public.profiles where id = v_uid and is_active;
  if not found then
    raise exception 'Аккаунт недоступен' using errcode = '42501';
  end if;

  -- Повторная отправка той же формы
  if v_idem is not null then
    select * into v_existing from public.orders where user_id = v_uid and idempotency_key = v_idem;
    if found then
      return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number,
                                'total', v_existing.total, 'duplicate', true);
    end if;
  end if;

  if p -> 'items' is null or jsonb_typeof(p -> 'items') <> 'array'
     or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'Корзина пуста';
  end if;

  v_dtype := (p ->> 'delivery_type')::public.delivery_type;
  v_pay   := (p ->> 'payment_method')::public.payment_method;
  if not ((v_dtype = 'delivery' and v_pay = 'cash_on_delivery')
       or (v_dtype = 'pickup'   and v_pay = 'pay_on_pickup')) then
    raise exception 'Выбранный способ оплаты недоступен для этого способа получения';
  end if;

  v_name  := coalesce(nullif(trim(p ->> 'customer_name'), ''),  nullif(trim(v_profile.full_name), ''));
  v_phone := coalesce(nullif(trim(p ->> 'customer_phone'), ''), nullif(trim(v_profile.phone), ''));
  if v_name is null or v_phone is null then
    raise exception 'Укажите имя и телефон';
  end if;

  v_date := coalesce(nullif(p ->> 'delivery_date', '')::date, v_today);
  if v_date < v_today then
    raise exception 'Дата получения не может быть в прошлом';
  end if;

  if v_dtype = 'delivery' then
    select * into v_zone from public.delivery_zones
    where id = nullif(p ->> 'delivery_zone_id', '')::uuid and is_active;
    if not found then raise exception 'Выберите зону доставки'; end if;
    v_addr := nullif(trim(p ->> 'delivery_address'), '');
    if v_addr is null then raise exception 'Укажите адрес доставки'; end if;
  end if;

  insert into public.orders (
    user_id, delivery_type, payment_method, customer_name, customer_phone,
    delivery_zone_id, address_id, delivery_address, delivery_date, delivery_time_slot,
    comment, idempotency_key
  ) values (
    v_uid, v_dtype, v_pay, v_name, v_phone,
    case when v_dtype = 'delivery' then v_zone.id end,
    nullif(p ->> 'address_id', '')::uuid, v_addr, v_date,
    nullif(trim(p ->> 'delivery_time_slot'), ''),
    nullif(trim(p ->> 'comment'), ''), v_idem
  ) returning id, order_number into v_order_id, v_number;

  -- Позиции: группируем дубли, сортируем для единого порядка блокировок
  for r in
    select (e ->> 'product_id')::uuid as pid, sum((e ->> 'quantity')::numeric) as qty
    from jsonb_array_elements(p -> 'items') e
    group by 1 order by 1
  loop
    if r.qty is null or r.qty <= 0 then
      raise exception 'Количество должно быть больше 0';
    end if;

    select * into v_prod from public.products where id = r.pid;
    if not found or not v_prod.is_active then
      raise exception 'Товар недоступен для заказа';
    end if;
    if v_prod.unit in ('pcs', 'pack') and r.qty <> trunc(r.qty) then
      raise exception 'Количество товара «%» должно быть целым', v_prod.name;
    end if;

    select quantity, avg_cost into v_stock, v_cost
    from public.inventory where product_id = r.pid for update;
    if v_stock is null or v_stock < r.qty then
      raise exception 'Недостаточно товара «%» (доступно: %)', v_prod.name, coalesce(v_stock, 0)
        using errcode = '23514';
    end if;

    v_price := public.product_effective_price(r.pid);

    insert into public.order_items (
      order_id, product_id, product_name, unit, quantity, unit_price, unit_cost, line_total
    ) values (
      v_order_id, r.pid, v_prod.name, v_prod.unit, r.qty, v_price, v_cost, round(v_price * r.qty, 2)
    );
    v_subtotal := v_subtotal + round(v_price * r.qty, 2);

    perform public._inv_move(r.pid, 'sale', -r.qty, v_cost, v_order_id, null, null, null, null, now());
    update public.products set sales_count = sales_count + 1 where id = r.pid;
  end loop;

  if v_dtype = 'delivery' then
    if v_subtotal < v_zone.min_order_total then
      raise exception 'Минимальная сумма заказа для зоны «%»: % сом.', v_zone.name, v_zone.min_order_total;
    end if;
    v_fee := case when v_zone.free_delivery_from is not null and v_subtotal >= v_zone.free_delivery_from
                  then 0 else v_zone.delivery_fee end;
  end if;

  if nullif(trim(p ->> 'promo_code'), '') is not null then
    select pc.promo_id, pc.discount, pc.error into v_promo_id, v_promo_amt, v_promo_err
    from public._promo_check(p ->> 'promo_code', v_uid, v_subtotal) pc;
    if v_promo_err is not null then raise exception '%', v_promo_err; end if;

    update public.promo_codes set used_count = used_count + 1
    where id = v_promo_id and (usage_limit is null or used_count < usage_limit);
    if not found then raise exception 'Промокод больше недоступен'; end if;
  end if;

  v_total := greatest(v_subtotal - v_promo_amt, 0) + v_fee;

  update public.orders
     set subtotal = v_subtotal, promo_code_id = v_promo_id, promo_discount = v_promo_amt,
         delivery_fee = v_fee, total = v_total
   where id = v_order_id;

  perform public.notify_user(v_uid, 'order_created', 'Заказ принят',
    'Заказ ' || v_number || ' принят в обработку',
    jsonb_build_object('order_id', v_order_id));
  perform public.notify_staff('new_order', 'Новый заказ ' || v_number,
    format('Сумма: %s сом., %s', v_total, v_name),
    jsonb_build_object('order_id', v_order_id));

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number,
                            'total', v_total, 'duplicate', false);

exception
  when unique_violation then
    -- Параллельная отправка той же формы: возвращаем уже созданный заказ
    if v_idem is not null then
      select * into v_existing from public.orders where user_id = v_uid and idempotency_key = v_idem;
      if found then
        return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number,
                                  'total', v_existing.total, 'duplicate', true);
      end if;
    end if;
    raise;
end;
$$;

-- ---------- Смена статуса (сотрудник) -------------------------------------
create function public.set_order_status(
  p_order_id      uuid,
  p_status        public.order_status,
  p_note          text default null,
  p_courier_name  text default null,
  p_courier_phone text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders%rowtype;
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status in ('delivered', 'cancelled') then
    raise exception 'Заказ уже завершён, статус изменить нельзя';
  end if;
  if p_status <> 'cancelled' and p_status < o.status then
    raise exception 'Нельзя вернуть заказ на предыдущий статус';
  end if;

  perform set_config('gg.note', coalesce(p_note, ''), true);

  if p_status = 'cancelled' then
    perform public._cancel_order_internal(p_order_id, p_note);
  else
    update public.orders set
      status         = p_status,
      courier_name   = coalesce(nullif(trim(p_courier_name), ''),  courier_name),
      courier_phone  = coalesce(nullif(trim(p_courier_phone), ''), courier_phone),
      handled_by     = auth.uid(),
      delivered_at   = case when p_status = 'delivered' then now() else delivered_at end,
      payment_status = case when p_status = 'delivered' then 'paid' else payment_status end
    where id = p_order_id;
  end if;

  v_label := case p_status
    when 'pending' then 'Заказ принят' when 'confirmed' then 'Заказ подтверждён'
    when 'assembling' then 'Заказ собирается' when 'ready' then 'Заказ готов к отправке'
    when 'handed_to_courier' then 'Заказ передан курьеру' when 'on_the_way' then 'Заказ в пути'
    when 'delivered' then 'Заказ доставлен' when 'cancelled' then 'Заказ отменён' end;

  perform public.notify_user(o.user_id, 'order_status', v_label, o.order_number,
    jsonb_build_object('order_id', o.id, 'status', p_status));
end;
$$;

-- ---------- Назначение курьера без смены статуса --------------------------
create function public.assign_courier(p_order_id uuid, p_name text, p_phone text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Укажите имя курьера'; end if;

  update public.orders
     set courier_name = trim(p_name), courier_phone = nullif(trim(p_phone), ''),
         handled_by = auth.uid()
   where id = p_order_id and status not in ('delivered', 'cancelled');
  if not found then raise exception 'Заказ не найден или уже завершён'; end if;
end;
$$;

-- ---------- Отмена заказа клиентом ----------------------------------------
create function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare o public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Требуется авторизация' using errcode = '28000';
  end if;
  select * into o from public.orders
  where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status not in ('pending', 'confirmed') then
    raise exception 'Заказ уже собирается — отмена недоступна. Свяжитесь с магазином.';
  end if;

  perform set_config('gg.note', coalesce(nullif(p_reason, ''), 'Отменён клиентом'), true);
  perform public._cancel_order_internal(p_order_id, coalesce(nullif(p_reason, ''), 'Отменён клиентом'));
end;
$$;

-- ---------- Возврат товара клиентом ---------------------------------------
-- p_items: [{"order_item_id": "...", "quantity": 1}]
-- p_restock: true — годный товар возвращается на склад; false — товар не пригоден (убыток).
create function public.return_order_items(
  p_order_id uuid, p_items jsonb, p_restock boolean, p_reason text default null
) returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders%rowtype;
  r record;
  oi public.order_items%rowtype;
  v_returned numeric;
  v_factor numeric;
  v_refund numeric;
  v_total_refund numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status <> 'delivered' then
    raise exception 'Возврат возможен только для доставленного заказа';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Выберите товары для возврата';
  end if;

  -- Скидка по промокоду возвращается пропорционально
  v_factor := case when o.subtotal > 0 then 1 - (o.promo_discount / o.subtotal) else 1 end;

  for r in
    select (e ->> 'order_item_id')::uuid as item_id, sum((e ->> 'quantity')::numeric) as qty
    from jsonb_array_elements(p_items) e
    group by 1 order by 1
  loop
    select * into oi from public.order_items where id = r.item_id and order_id = p_order_id for update;
    if not found then raise exception 'Позиция не относится к заказу'; end if;
    if r.qty is null or r.qty <= 0 then raise exception 'Количество должно быть больше 0'; end if;

    select coalesce(sum(quantity), 0) into v_returned
    from public.order_returns where order_item_id = oi.id;
    if v_returned + r.qty > oi.quantity then
      raise exception 'Нельзя вернуть больше, чем куплено («%»: куплено %, уже возвращено %)',
        oi.product_name, oi.quantity, v_returned;
    end if;

    v_refund := round(oi.line_total * (r.qty / oi.quantity) * v_factor, 2);
    v_total_refund := v_total_refund + v_refund;

    insert into public.order_returns (
      order_id, order_item_id, quantity, refund_amount, unit_cost, restocked, reason, created_by
    ) values (
      p_order_id, oi.id, r.qty, v_refund, oi.unit_cost, p_restock, p_reason, auth.uid()
    );

    if p_restock and oi.product_id is not null then
      perform public._inv_move(oi.product_id, 'customer_return', r.qty, oi.unit_cost,
                               p_order_id, null, null, 'customer_return', p_reason, now());
    end if;
  end loop;

  if not exists (
    select 1 from public.order_items i
    where i.order_id = p_order_id
      and i.quantity > coalesce((select sum(quantity) from public.order_returns where order_item_id = i.id), 0)
  ) then
    update public.orders set payment_status = 'refunded' where id = p_order_id;
  end if;

  perform public.notify_user(o.user_id, 'order_return', 'Возврат оформлен',
    format('Заказ %s, сумма возврата: %s сом.', o.order_number, v_total_refund),
    jsonb_build_object('order_id', o.id));
  return v_total_refund;
end;
$$;

-- ---------- Управление пользователями (администратор) --------------------
create function public.admin_set_user_role(
  p_user_id uuid, p_role public.user_role, p_active boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Нельзя изменить собственную роль или заблокировать себя';
  end if;
  update public.profiles set role = p_role, is_active = coalesce(p_active, true)
  where id = p_user_id;
  if not found then raise exception 'Пользователь не найден'; end if;
end;
$$;

-- ---------- Права на выполнение -------------------------------------------
-- Функции в представлении проверяются от имени вызывающего, поэтому витрине нужен EXECUTE.
-- Функция возвращает только публичную цену (с учётом активных акций).
revoke all on function public.product_effective_price(uuid)               from public;
grant execute on function public.product_effective_price(uuid)            to anon, authenticated;
revoke all on function public._promo_check(text, uuid, numeric)           from public, anon, authenticated;
revoke all on function public._cancel_order_internal(uuid, text)          from public, anon, authenticated;

revoke all on function public.validate_promo_code(text, numeric)          from public, anon;
revoke all on function public.create_order(jsonb)                         from public, anon;
revoke all on function public.set_order_status(uuid, public.order_status, text, text, text) from public, anon;
revoke all on function public.assign_courier(uuid, text, text)            from public, anon;
revoke all on function public.cancel_my_order(uuid, text)                 from public, anon;
revoke all on function public.return_order_items(uuid, jsonb, boolean, text) from public, anon;
revoke all on function public.admin_set_user_role(uuid, public.user_role, boolean) from public, anon;

grant execute on function public.validate_promo_code(text, numeric)       to authenticated;
grant execute on function public.create_order(jsonb)                      to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, text, text, text) to authenticated;
grant execute on function public.assign_courier(uuid, text, text)         to authenticated;
grant execute on function public.cancel_my_order(uuid, text)              to authenticated;
grant execute on function public.return_order_items(uuid, jsonb, boolean, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role, boolean) to authenticated;
