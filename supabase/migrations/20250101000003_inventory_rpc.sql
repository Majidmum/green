-- ============================================================================
-- GREEN GARDEN — 003: складские операции (атомарные RPC)
-- ============================================================================
-- Остаток меняется ТОЛЬКО здесь, и каждое изменение пишется в журнал
-- inventory_transactions в той же транзакции. Строка склада блокируется
-- (FOR UPDATE), поэтому параллельные операции не перезапишут друг друга.
-- ============================================================================

-- ---------- Ядро: одно движение по одному товару --------------------------
create function public._inv_move(
  p_product_id  uuid,
  p_type        public.inventory_tx_type,
  p_change      numeric,
  p_unit_cost   numeric default null,
  p_order_id    uuid default null,
  p_supplier_id uuid default null,
  p_document    text default null,
  p_reason      text default null,
  p_comment     text default null,
  p_occurred    timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_qty  numeric;
  v_avg  numeric;
  v_new  numeric;
  v_cost numeric;
  v_id   uuid;
begin
  if p_change is null or p_change = 0 then
    raise exception 'Количество должно быть ненулевым';
  end if;

  insert into public.inventory (product_id, quantity, avg_cost)
  values (p_product_id, 0, 0) on conflict (product_id) do nothing;

  select quantity, avg_cost into v_qty, v_avg
  from public.inventory where product_id = p_product_id for update;

  v_new := v_qty + p_change;
  if v_new < 0 then
    raise exception 'Недостаточный остаток (доступно: %, требуется: %)', v_qty, abs(p_change)
      using errcode = '23514';
  end if;

  v_cost := coalesce(p_unit_cost, v_avg);

  -- Средневзвешенная себестоимость пересчитывается только при поступлении товара
  if p_change > 0 and p_type in ('purchase', 'sale_cancel') and v_new > 0 then
    v_avg := round(((v_qty * v_avg) + (p_change * v_cost)) / v_new, 4);
  end if;

  update public.inventory
     set quantity = v_new, avg_cost = v_avg, updated_at = now()
   where product_id = p_product_id;

  insert into public.inventory_transactions (
    product_id, type, quantity_change, quantity_before, quantity_after, unit_cost,
    supplier_id, order_id, document_number, reason, comment, occurred_at, created_by
  ) values (
    p_product_id, p_type, p_change, v_qty, v_new, v_cost,
    p_supplier_id, p_order_id, p_document, p_reason, p_comment, p_occurred, auth.uid()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- ---------- Приход товара (документ с несколькими строками) ---------------
-- p_items: [{"product_id": "...", "quantity": 10, "unit_cost": 5.5}, ...]
create function public.receive_stock(
  p_supplier_id     uuid,
  p_document_number text,
  p_date            date,
  p_comment         text,
  p_items           jsonb
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
  v_when  timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Добавьте хотя бы одну позицию';
  end if;
  if p_supplier_id is not null
     and not exists (select 1 from public.suppliers where id = p_supplier_id) then
    raise exception 'Поставщик не найден';
  end if;

  v_when := case when p_date is null then now()
                 else (p_date::timestamp at time zone 'Asia/Dushanbe') end;

  -- Группировка по товару + сортировка: единый порядок блокировок, без взаимных блокировок
  for r in
    select (e ->> 'product_id')::uuid                          as pid,
           sum((e ->> 'quantity')::numeric)                    as qty,
           sum((e ->> 'quantity')::numeric * (e ->> 'unit_cost')::numeric)
             / nullif(sum((e ->> 'quantity')::numeric), 0)     as cost,
           bool_and((e ->> 'quantity')::numeric > 0
                    and (e ->> 'unit_cost')::numeric >= 0)     as valid
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if not coalesce(r.valid, false) then
      raise exception 'Количество должно быть больше 0, закупочная цена — не меньше 0';
    end if;
    if not exists (select 1 from public.products where id = r.pid) then
      raise exception 'Товар не найден: %', r.pid;
    end if;
    perform public._inv_move(
      r.pid, 'purchase', r.qty, round(r.cost, 4), null,
      p_supplier_id, nullif(trim(p_document_number), ''), null, p_comment, v_when
    );
    v_count := v_count + 1;
  end loop;

  perform public.notify_staff(
    'stock_receipt', 'Приход товара',
    format('Позиций: %s%s', v_count,
           coalesce(', документ ' || nullif(trim(p_document_number), ''), '')),
    '{}'::jsonb
  );
  return v_count;
end;
$$;

-- ---------- Расход / списание ---------------------------------------------
-- p_reason: spoilage | loss | supplier_return | other
create function public.write_off_stock(
  p_product_id  uuid,
  p_quantity    numeric,
  p_reason      text,
  p_comment     text default null,
  p_date        date default null,
  p_supplier_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_type inventory_tx_type;
  v_id   uuid;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Количество должно быть больше 0';
  end if;
  if p_reason not in ('spoilage', 'loss', 'supplier_return', 'other') then
    raise exception 'Недопустимая причина списания';
  end if;
  select name into v_name from public.products where id = p_product_id;
  if v_name is null then
    raise exception 'Товар не найден';
  end if;

  v_type := case when p_reason = 'supplier_return'
                 then 'supplier_return'::public.inventory_tx_type
                 else 'write_off'::public.inventory_tx_type end;

  v_id := public._inv_move(
    p_product_id, v_type, -p_quantity, null, null, p_supplier_id, null, p_reason, p_comment,
    case when p_date is null then now() else (p_date::timestamp at time zone 'Asia/Dushanbe') end
  );

  perform public.notify_staff(
    'stock_write_off', 'Списание товара',
    format('%s: %s (%s)', v_name, p_quantity, p_reason),
    jsonb_build_object('product_id', p_product_id)
  );
  return v_id;
end;
$$;

-- ---------- Инвентаризация -------------------------------------------------
-- p_items: [{"product_id": "...", "actual_quantity": 12.5, "expected_quantity": 13}, ...]
-- expected_quantity — остаток, который видел сотрудник. Если за время подсчёта остаток
-- изменился (продажа/приход), операция отклоняется, чтобы не затереть чужие движения.
create function public.stocktake(p_items jsonb, p_comment text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_sys       numeric;
  v_diff      numeric;
  v_shortage  numeric := 0;
  v_surplus   numeric := 0;
  v_changed   integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Нет позиций для инвентаризации';
  end if;

  for r in
    select (e ->> 'product_id')::uuid                       as pid,
           (e ->> 'actual_quantity')::numeric               as actual,
           nullif(e ->> 'expected_quantity', '')::numeric   as expected
    from jsonb_array_elements(p_items) e
    order by 1
  loop
    if r.actual is null or r.actual < 0 then
      raise exception 'Фактическое количество не может быть отрицательным';
    end if;

    insert into public.inventory (product_id, quantity, avg_cost)
    values (r.pid, 0, 0) on conflict (product_id) do nothing;
    select quantity into v_sys from public.inventory where product_id = r.pid for update;

    if r.expected is not null and r.expected <> v_sys then
      raise exception 'Остаток товара изменился во время подсчёта (было %, стало %). Повторите инвентаризацию.',
        r.expected, v_sys using errcode = '40001';
    end if;

    v_diff := r.actual - v_sys;
    if v_diff <> 0 then
      perform public._inv_move(
        r.pid, 'adjustment', v_diff, null, null, null, null,
        case when v_diff < 0 then 'shortage' else 'surplus' end,
        p_comment, now()
      );
      v_changed := v_changed + 1;
      if v_diff < 0 then v_shortage := v_shortage + abs(v_diff);
      else v_surplus := v_surplus + v_diff; end if;
    end if;
  end loop;

  if v_changed > 0 then
    perform public.notify_staff(
      'stocktake', 'Инвентаризация проведена',
      format('Корректировок: %s', v_changed), '{}'::jsonb
    );
  end if;

  return jsonb_build_object('adjusted', v_changed, 'shortage', v_shortage, 'surplus', v_surplus);
end;
$$;

-- ---------- Права на выполнение -------------------------------------------
revoke all on function public._inv_move(uuid, public.inventory_tx_type, numeric, numeric, uuid, uuid, text, text, text, timestamptz)
  from public, anon, authenticated;

revoke all on function public.receive_stock(uuid, text, date, text, jsonb)                  from public, anon;
revoke all on function public.write_off_stock(uuid, numeric, text, text, date, uuid)        from public, anon;
revoke all on function public.stocktake(jsonb, text)                                        from public, anon;
grant execute on function public.receive_stock(uuid, text, date, text, jsonb)               to authenticated;
grant execute on function public.write_off_stock(uuid, numeric, text, text, date, uuid)     to authenticated;
grant execute on function public.stocktake(jsonb, text)                                     to authenticated;
