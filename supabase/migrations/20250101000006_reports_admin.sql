-- Этапы 5–7: отчёты для руководителя/админа, обзор склада, клиенты, смена закупочной цены.
-- Все функции — SECURITY DEFINER с проверкой роли внутри. Они только читают данные,
-- кроме set_product_cost (админ, с записью в audit_logs).

-- ---------- Обзор склада (RLS нижележащих таблиц применяется: клиентам вернёт 0 строк) ----------
create view public.stock_overview with (security_invoker = true) as
select
  p.id as product_id, p.name, p.slug, p.unit, p.is_active, p.min_stock,
  c.name as category_name,
  i.quantity, i.avg_cost,
  round(i.quantity * i.avg_cost, 2) as stock_value,
  case when i.quantity <= 0 then 'zero'
       when i.quantity <= p.min_stock then 'low'
       else 'ok' end as stock_status
from public.products p
join public.categories c on c.id = p.category_id
join public.inventory i on i.product_id = p.id;

grant select on public.stock_overview to authenticated;
revoke all on public.stock_overview from anon;

-- ---------- Закупочная цена (себестоимость) вручную ----------
create function public.set_product_cost(p_product_id uuid, p_cost numeric, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_old numeric;
begin
  if not public.is_admin() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_cost is null or p_cost < 0 then
    raise exception 'Закупочная цена не может быть отрицательной';
  end if;
  select avg_cost into v_old from public.inventory where product_id = p_product_id for update;
  if not found then raise exception 'Товар не найден'; end if;
  if v_old = p_cost then return; end if;

  update public.inventory set avg_cost = p_cost, updated_at = now() where product_id = p_product_id;
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, actor_id)
  values ('inventory', p_product_id::text, 'COST_CHANGE',
          jsonb_build_object('avg_cost', v_old),
          jsonb_build_object('avg_cost', p_cost, 'reason', p_reason),
          auth.uid());
end;
$$;

-- ---------- Клиенты со статистикой ----------
create function public.admin_customers(p_search text default null, p_limit integer default 20, p_offset integer default 0)
returns table (
  id uuid, full_name text, phone text, email text, is_active boolean, created_at timestamptz,
  orders_count bigint, delivered_count bigint, total_spent numeric, last_order_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare v_like text;
begin
  if not public.is_staff() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  v_like := case when nullif(trim(p_search), '') is null then null
                 else '%' || replace(replace(replace(trim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  return query
  select p.id, p.full_name, p.phone, p.email, p.is_active, p.created_at,
         count(o.id), count(o.id) filter (where o.status = 'delivered'),
         coalesce(sum(o.total) filter (where o.status = 'delivered'), 0),
         max(o.created_at),
         count(*) over ()
  from public.profiles p
  left join public.orders o on o.user_id = p.id
  where p.role = 'customer'
    and (v_like is null or p.full_name ilike v_like or p.phone ilike v_like or p.email ilike v_like)
  group by p.id
  order by max(o.created_at) desc nulls last, p.created_at desc
  limit greatest(least(p_limit, 200), 1) offset greatest(p_offset, 0);
end;
$$;

-- ---------- Главный отчёт ----------
-- Период — даты по времени Душанбе, обе границы включительно.
-- Выручка = сумма total доставленных заказов (по дате доставки) − возвраты денег за период.
-- Себестоимость = Σ unit_cost × quantity доставленных позиций − себестоимость возвращённого на склад.
-- Валовая = выручка − себестоимость. Чистая = валовая − операционные расходы − списания (порча/потери).
-- Остатки (стоимость склада) — текущие, к периоду не привязаны и в прибыль не входят.
create function public.report_dashboard(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_from timestamptz;
  v_to   timestamptz;
  v_tz   constant text := 'Asia/Dushanbe';
  v_rev_gross numeric; v_ret numeric; v_cogs_gross numeric; v_cogs_ret numeric;
  v_revenue numeric; v_cogs numeric; v_gross numeric; v_exp numeric; v_wo numeric; v_net numeric;
  v_delivered integer; v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Недостаточно прав' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Неверный период';
  end if;
  if p_to - p_from > 800 then
    raise exception 'Период не может превышать 800 дней';
  end if;
  v_from := p_from::timestamp at time zone v_tz;
  v_to   := (p_to + 1)::timestamp at time zone v_tz;

  select coalesce(sum(o.total), 0), count(*) into v_rev_gross, v_delivered
  from public.orders o where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to;

  select coalesce(sum(r.refund_amount), 0),
         coalesce(sum(r.unit_cost * r.quantity) filter (where r.restocked), 0)
    into v_ret, v_cogs_ret
  from public.order_returns r where r.created_at >= v_from and r.created_at < v_to;

  select coalesce(sum(oi.unit_cost * oi.quantity), 0) into v_cogs_gross
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to;

  v_revenue := v_rev_gross - v_ret;
  v_cogs    := v_cogs_gross - v_cogs_ret;
  v_gross   := v_revenue - v_cogs;

  select coalesce(sum(amount), 0) into v_exp
  from public.expenses where not is_voided and expense_date between p_from and p_to;

  select coalesce(sum(abs(t.quantity_change) * t.unit_cost), 0) into v_wo
  from public.inventory_transactions t
  where t.type = 'write_off' and t.occurred_at >= v_from and t.occurred_at < v_to;

  v_net := v_gross - v_exp - v_wo;

  v_result := jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'kpis', jsonb_build_object(
      'revenue', v_revenue,
      'revenue_before_returns', v_rev_gross,
      'returns_amount', v_ret,
      'cogs', v_cogs,
      'gross_profit', v_gross,
      'expenses', v_exp,
      'writeoffs', v_wo,
      'net_profit', v_net,
      'orders_created', (select count(*) from public.orders where created_at >= v_from and created_at < v_to),
      'orders_delivered', v_delivered,
      'orders_cancelled', (select count(*) from public.orders where status = 'cancelled' and cancelled_at >= v_from and cancelled_at < v_to),
      'orders_active', (select count(*) from public.orders where status not in ('delivered', 'cancelled')),
      'avg_check', case when v_delivered > 0 then round(v_rev_gross / v_delivered, 2) else 0 end,
      'customers_total', (select count(*) from public.profiles where role = 'customer'),
      'customers_new', (select count(*) from public.profiles where role = 'customer' and created_at >= v_from and created_at < v_to),
      'customers_buying', (select count(distinct user_id) from public.orders where status = 'delivered' and delivered_at >= v_from and delivered_at < v_to),
      'sold_by_unit', coalesce((
        select jsonb_object_agg(x.unit, x.qty) from (
          select oi.unit::text as unit, sum(oi.quantity) as qty
          from public.order_items oi join public.orders o on o.id = oi.order_id
          where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to
          group by oi.unit) x), '{}'::jsonb),
      'stock_value', (select coalesce(sum(quantity * avg_cost), 0) from public.inventory),
      'stock_positions', (select count(*) from public.inventory where quantity > 0),
      'shortage_amount', (select coalesce(sum(abs(quantity_change) * unit_cost), 0) from public.inventory_transactions
                          where type = 'adjustment' and quantity_change < 0 and occurred_at >= v_from and occurred_at < v_to),
      'surplus_amount', (select coalesce(sum(quantity_change * unit_cost), 0) from public.inventory_transactions
                         where type = 'adjustment' and quantity_change > 0 and occurred_at >= v_from and occurred_at < v_to)
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day, 'revenue', coalesce(s.revenue, 0) - coalesce(rt.refund, 0),
        'cogs', coalesce(s.cogs, 0) - coalesce(rt.cogs, 0),
        'orders', coalesce(cr.n, 0), 'delivered', coalesce(s.n, 0), 'cancelled', coalesce(cn.n, 0),
        'new_customers', coalesce(nc.n, 0)) order by d.day)
      from generate_series(p_from, p_to, interval '1 day') g(day_ts)
      cross join lateral (select g.day_ts::date as day) d
      left join (
        select (o.delivered_at at time zone v_tz)::date as day, sum(o.total) as revenue, count(*) as n,
               sum((select coalesce(sum(oi.unit_cost * oi.quantity), 0) from public.order_items oi where oi.order_id = o.id)) as cogs
        from public.orders o where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to
        group by 1) s on s.day = d.day
      left join (
        select (r.created_at at time zone v_tz)::date as day, sum(r.refund_amount) as refund,
               sum(r.unit_cost * r.quantity) filter (where r.restocked) as cogs
        from public.order_returns r where r.created_at >= v_from and r.created_at < v_to group by 1) rt on rt.day = d.day
      left join (
        select (created_at at time zone v_tz)::date as day, count(*) as n from public.orders
        where created_at >= v_from and created_at < v_to group by 1) cr on cr.day = d.day
      left join (
        select (cancelled_at at time zone v_tz)::date as day, count(*) as n from public.orders
        where status = 'cancelled' and cancelled_at >= v_from and cancelled_at < v_to group by 1) cn on cn.day = d.day
      left join (
        select (created_at at time zone v_tz)::date as day, count(*) as n from public.profiles
        where role = 'customer' and created_at >= v_from and created_at < v_to group by 1) nc on nc.day = d.day
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(t) from (
        select oi.product_name as name, oi.unit::text as unit, sum(oi.quantity) as qty, sum(oi.line_total) as revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to
        group by oi.product_name, oi.unit order by sum(oi.line_total) desc limit 10) t), '[]'::jsonb),
    'top_categories', coalesce((
      select jsonb_agg(t) from (
        select coalesce(c.name, 'Без категории') as name, sum(oi.line_total) as revenue, count(distinct o.id) as orders
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        left join public.products p on p.id = oi.product_id
        left join public.categories c on c.id = p.category_id
        where o.status = 'delivered' and o.delivered_at >= v_from and o.delivered_at < v_to
        group by 1 order by sum(oi.line_total) desc limit 10) t), '[]'::jsonb),
    'by_hour', coalesce((
      select jsonb_agg(jsonb_build_object('hour', h.hour, 'orders', coalesce(x.n, 0)) order by h.hour)
      from generate_series(0, 23) h(hour)
      left join (
        select extract(hour from created_at at time zone v_tz)::int as hour, count(*) as n
        from public.orders where created_at >= v_from and created_at < v_to group by 1) x on x.hour = h.hour
    ), '[]'::jsonb),
    'expenses_by_category', coalesce((
      select jsonb_agg(t) from (
        select category, sum(amount) as amount from public.expenses
        where not is_voided and expense_date between p_from and p_to group by category order by sum(amount) desc) t), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(t order by t.last_activity desc nulls last) from (
        select pr.id, pr.full_name, pr.role::text as role, pr.is_active,
          (select count(distinct h.order_id) from public.order_status_history h
            where h.changed_by = pr.id and h.created_at >= v_from and h.created_at < v_to) as orders_handled,
          (select count(*) from public.inventory_transactions t
            where t.created_by = pr.id and t.occurred_at >= v_from and t.occurred_at < v_to) as stock_ops,
          (select count(*) from public.audit_logs a
            where a.actor_id = pr.id and a.created_at >= v_from and a.created_at < v_to) as actions,
          greatest(
            (select max(h.created_at) from public.order_status_history h where h.changed_by = pr.id),
            (select max(t.created_at) from public.inventory_transactions t where t.created_by = pr.id),
            (select max(a.created_at) from public.audit_logs a where a.actor_id = pr.id)) as last_activity
        from public.profiles pr where pr.role in ('admin', 'manager')) t), '[]'::jsonb)
  );
  return v_result;
end;
$$;

revoke all on function public.set_product_cost(uuid, numeric, text)  from public, anon;
revoke all on function public.admin_customers(text, integer, integer) from public, anon;
revoke all on function public.report_dashboard(date, date)           from public, anon;
grant execute on function public.set_product_cost(uuid, numeric, text)  to authenticated;
grant execute on function public.admin_customers(text, integer, integer) to authenticated;
grant execute on function public.report_dashboard(date, date)           to authenticated;
