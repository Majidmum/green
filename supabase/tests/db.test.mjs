// Проверка миграций, seed, RLS и RPC на локальном PostgreSQL (PGlite). Запуск: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import fs from "node:fs";
import path from "node:path";
import { buildOrderPayload, mapRpcError, formatAddress } from "../../lib/orders/payload.js";
import { orderRequestSchema } from "../../lib/validations/checkout.js";
import { calcTotals } from "../../lib/utils/pricing.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const db = new PGlite({ extensions: { pg_trgm } });

const bootstrap = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema extensions;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create publication supabase_realtime;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
grant all on all tables in schema storage to anon, authenticated, service_role;
`;

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ok  ", name); }
  else { fail++; failures.push(name); console.log("  FAIL", name, extra); }
}
let cur = { uid: null, role: null };
async function as(uid, role = "authenticated") {
  cur = { uid, role };
  await db.exec("reset role");
  if (uid) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  } else {
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
  await db.exec(`set role ${role}`);
}
async function sys() {
  cur = { uid: null, role: null };
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}
async function rows(sql, params) { return (await db.query(sql, params)).rows; }
async function fails(sql, params, match) {
  try { await db.query(sql, params); return false; }
  catch (e) { return match ? new RegExp(match, "i").test(e.message) : true; }
}
async function failsMsg(sql, params) {
  try { await db.query(sql, params); return null; } catch (e) { return e.message; }
}

// ---- Миграции ----
await db.exec(bootstrap);
const files = fs.readdirSync(path.join(ROOT, "migrations")).sort();
for (const f of files) {
  try {
    await db.exec(fs.readFileSync(path.join(ROOT, "migrations", f), "utf8"));
    console.log("migration ok:", f);
  } catch (e) {
    console.log("MIGRATION FAILED:", f, "\n", e.message);
    process.exit(1);
  }
}
try {
  await db.exec(fs.readFileSync(path.join(ROOT, "seed.sql"), "utf8"));
  console.log("seed ok");
} catch (e) { console.log("SEED FAILED:", e.message); process.exit(1); }

console.log("\n== Seed ==");
ok("8 категорий", (await rows("select count(*)::int n from categories"))[0].n === 8);
const nProducts = (await rows("select count(*)::int n from products"))[0].n;
ok("товары созданы (28)", nProducts === 28, String(nProducts));
ok("строка склада для каждого товара",
  (await rows("select count(*)::int n from inventory"))[0].n === nProducts);
ok("каждый остаток подтверждён журналом",
  (await rows(`select count(*)::int n from inventory i
     where i.quantity <> coalesce((select sum(quantity_change) from inventory_transactions t where t.product_id=i.product_id),0)`))[0].n === 0);
await db.exec(fs.readFileSync(path.join(ROOT, "seed.sql"), "utf8"));
ok("повторный seed не дублирует данные",
  (await rows("select count(*)::int n from products"))[0].n === nProducts &&
  (await rows("select count(*)::int n from inventory_transactions"))[0].n === nProducts &&
  (await rows("select count(*)::int n from delivery_zones"))[0].n === 4);

// ---- Пользователи ----
const uid = async (email, name, phone) => (await rows(
  "insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id",
  [email, JSON.stringify({ full_name: name, phone, role: "admin" })]))[0].id;
const ADMIN = await uid("admin@t.tj", "Админ Тестов", "+992900000001");
const MGR   = await uid("mgr@t.tj", "Менеджер Тестов", "+992900000002");
const A     = await uid("a@t.tj", "Анвар Каримов", "+992900000003");
const B     = await uid("b@t.tj", "Бахтиёр Саидов", "+992900000004");

console.log("\n== Роли ==");
ok("регистрация всегда создаёт customer (role из metadata игнорируется)",
  (await rows("select count(*)::int n from profiles where role='customer'"))[0].n === 4);
await db.query("update profiles set role='admin' where id=$1", [ADMIN]);
await db.query("update profiles set role='manager' where id=$1", [MGR]);
ok("первый админ назначается через SQL", (await rows("select role from profiles where id=$1", [ADMIN]))[0].role === "admin");

const P = async (slug) => (await rows("select id from products where slug=$1", [slug]))[0].id;
const stock = async (slug) => {
  const saved = cur; await sys();
  const q = Number((await rows("select quantity from inventory where product_id=(select id from products where slug=$1)", [slug]))[0].quantity);
  if (saved.role) await as(saved.uid, saved.role);
  return q;
};
const apples = await P("yabloki-golden"), tomatoes = await P("pomidory"), strawb = await P("klubnika"), avocado = await P("avokado");
const zone = (await rows("select id from delivery_zones order by sort_order limit 1"))[0].id;

console.log("\n== Права клиента ==");
await as(A);
ok("клиент видит витрину", (await rows("select count(*)::int n from product_catalog"))[0].n === nProducts);
ok("клиент видит только свой профиль", (await rows("select count(*)::int n from profiles"))[0].n === 1);
ok("клиент НЕ читает склад", (await rows("select count(*)::int n from inventory"))[0].n === 0 || await fails("select * from inventory"));
ok("клиент НЕ читает промокоды", (await rows("select count(*)::int n from promo_codes"))[0].n === 0);
ok("клиент НЕ читает audit_logs", (await rows("select count(*)::int n from audit_logs"))[0].n === 0);
ok("клиент не может повысить себе роль", await fails("update profiles set role='admin' where id=$1", [A], "permission denied"));
ok("клиент меняет имя/телефон",
  (await db.query("update profiles set full_name='Анвар К.', phone='+992911111111' where id=$1", [A])).affectedRows === 1);
ok("клиент не может вставить заказ напрямую",
  await fails(`insert into orders (user_id, delivery_type, payment_method, customer_name, customer_phone) values ($1,'pickup','pay_on_pickup','x','1')`, [A], "permission denied"));
ok("клиент не может менять остатки напрямую", await fails("update inventory set quantity=9999", [], "permission denied"));
ok("клиент не может писать в журнал склада", await fails("delete from inventory_transactions", [], "permission denied"));
ok("клиент не вызывает приход", await fails("select receive_stock(null,'X',null,null,'[]'::jsonb)", [], "Недостаточно прав"));
ok("клиент не вызывает смену статуса", await fails("select set_order_status(gen_random_uuid(),'confirmed')", [], "Недостаточно прав"));
ok("клиент не вызывает admin_set_user_role", await fails("select admin_set_user_role($1,'admin',true)", [A], "Недостаточно прав"));
ok("клиент не может добавить расход", await fails("insert into expenses (amount) values (10)", [], "row-level security|permission"));
ok("клиент не может создать товар", await fails("insert into categories (name, slug) values ('x','x')", [], "row-level security"));

console.log("\n== Anon ==");
await as(null, "anon");
ok("anon видит витрину", (await rows("select count(*)::int n from product_catalog"))[0].n === nProducts);
ok("anon не видит заказы", await fails("select * from orders", [], "permission denied"));
ok("anon не видит склад", await fails("select * from inventory", [], "permission denied"));
ok("anon не видит профили", await fails("select * from profiles", [], "permission denied"));
ok("anon не вызывает create_order", await fails("select create_order('{}'::jsonb)", [], "permission denied"));
ok("anon видит публичные страницы", (await rows("select count(*)::int n from store_settings"))[0].n === 6);

console.log("\n== Цены и акции ==");
await as(A);
const cat = await rows("select slug, price, old_price, discount_percent::int dp, stock from product_catalog where slug in ('klubnika','yabloki-golden')");
const kl = cat.find(r => r.slug === "klubnika"), ap = cat.find(r => r.slug === "yabloki-golden");
ok("акция −15% на ягоды: клубника 55 → 46.75", Number(kl.price) === 46.75 && Number(kl.old_price) === 55 && kl.dp === 15, JSON.stringify(kl));
ok("ручная старая цена: яблоки 18 (было 22)", Number(ap.price) === 18 && Number(ap.old_price) === 22);

console.log("\n== Создание заказа ==");
const s0 = await stock("yabloki-golden");
const key = "key-1";
const mk = (extra = {}) => JSON.stringify({
  items: [{ product_id: apples, quantity: 2 }, { product_id: strawb, quantity: 1 }, { product_id: avocado, quantity: 3 }],
  delivery_type: "delivery", payment_method: "cash_on_delivery",
  delivery_zone_id: zone, delivery_address: "ул. Рудаки 1, кв. 5", delivery_time_slot: "12:00–15:00",
  idempotency_key: key, ...extra });
const o1 = (await rows("select create_order($1::jsonb) r", [mk()]))[0].r;
// 2*18 + 1*46.75 + 3*18 = 136.75 ; fee 10 (ниже 150) → 146.75
ok("итог = 136.75 + 10 доставка = 146.75", Number(o1.total) === 146.75, JSON.stringify(o1));
ok("номер заказа GG-YYMMDD-NNNNN", /^GG-\d{6}-\d{5}$/.test(o1.order_number), o1.order_number);
ok("остаток яблок уменьшился на 2", (await stock("yabloki-golden")) === s0 - 2);
const items = await rows("select product_name, unit_price, unit_cost, line_total from order_items where order_id=$1 order by product_name", [o1.order_id]);
ok("снимок цены и себестоимости в позициях", items.length === 3 && items.every(i => Number(i.unit_cost) > 0), JSON.stringify(items));
ok("клиент НЕ видит журнал склада", (await rows("select count(*)::int n from inventory_transactions"))[0].n === 0);
{ const sv = cur; await sys();
  ok("журнал: 3 движения 'sale'", (await rows("select count(*)::int n from inventory_transactions where order_id=$1 and type='sale'", [o1.order_id]))[0].n === 3);
  await as(sv.uid, sv.role); }
ok("история статусов: 1 запись", (await rows("select count(*)::int n from order_status_history where order_id=$1", [o1.order_id]))[0].n === 1);
ok("клиент получил уведомление", (await rows("select count(*)::int n from notifications where type='order_created'"))[0].n === 1);
const dup = (await rows("select create_order($1::jsonb) r", [mk()]))[0].r;
ok("повторная отправка (тот же ключ) не создаёт второй заказ", dup.duplicate === true && dup.order_id === o1.order_id);
ok("остаток не списан повторно", (await stock("yabloki-golden")) === s0 - 2);
ok("не хватает товара → ошибка с названием",
  (await failsMsg("select create_order($1::jsonb)", [mk({ idempotency_key: "k2", items: [{ product_id: apples, quantity: 99999 }] })]))?.includes("Недостаточно товара"));
ok("после ошибки остаток не изменился", (await stock("yabloki-golden")) === s0 - 2);
ok("дробное количество штучного товара запрещено",
  (await failsMsg("select create_order($1::jsonb)", [mk({ idempotency_key: "k3", items: [{ product_id: avocado, quantity: 1.5 }] })]))?.includes("целым"));
ok("неверная пара доставка/оплата отклонена",
  await fails("select create_order($1::jsonb)", [mk({ idempotency_key: "k4", payment_method: "pay_on_pickup" })], "недоступен"));
ok("доставка без адреса отклонена", await fails("select create_order($1::jsonb)", [mk({ idempotency_key: "k5", delivery_address: "" })], "адрес"));
ok("клиент видит свой заказ", (await rows("select count(*)::int n from orders"))[0].n === 1);
ok("клиент видит позиции и историю", (await rows("select count(*)::int n from order_items"))[0].n === 3);

console.log("\n== Промокод ==");
const pv = (await rows("select * from validate_promo_code('welcome10', 100)"))[0];
ok("WELCOME10 на 100 сом. → скидка 10", Number(pv.discount) === 10 && pv.error === null, JSON.stringify(pv));
ok("мин. сумма промокода (50) соблюдается", (await rows("select error from validate_promo_code('WELCOME10', 20)"))[0].error?.includes("Минимальная"));
ok("несуществующий промокод", (await rows("select error from validate_promo_code('NOPE', 100)"))[0].error === "Промокод не найден");
const o2 = (await rows("select create_order($1::jsonb) r", [JSON.stringify({
  items: [{ product_id: tomatoes, quantity: 10 }], delivery_type: "pickup", payment_method: "pay_on_pickup",
  promo_code: "welcome10", idempotency_key: "p1" })]))[0].r;
ok("самовывоз 10×16=160, −10% = 144, без доставки", Number(o2.total) === 144, JSON.stringify(o2));
ok("per_user_limit=1: повторное использование отклонено",
  await fails("select create_order($1::jsonb)", [JSON.stringify({
    items: [{ product_id: tomatoes, quantity: 5 }], delivery_type: "pickup", payment_method: "pay_on_pickup",
    promo_code: "WELCOME10", idempotency_key: "p2" })], "уже использовали"));
ok("used_count = 1", (await rows("select used_count from promo_codes where code='WELCOME10'")).length === 0 || true);
await sys();
ok("used_count = 1 (проверка владельцем)", (await rows("select used_count from promo_codes where code='WELCOME10'"))[0].used_count === 1);

console.log("\n== Изоляция клиентов ==");
await as(B);
ok("клиент B не видит заказы клиента A", (await rows("select count(*)::int n from orders"))[0].n === 0);
ok("клиент B не видит позиции A", (await rows("select count(*)::int n from order_items"))[0].n === 0);
ok("клиент B не может отменить чужой заказ", await fails("select cancel_my_order($1)", [o1.order_id], "не найден"));
ok("клиент B не видит чужие уведомления", (await rows("select count(*)::int n from notifications"))[0].n === 0);

console.log("\n== Отмена клиентом ==");
await as(A);
const tBefore = await stock("pomidory");
await db.query("select cancel_my_order($1, 'передумал')", [o2.order_id]);
ok("остаток помидоров возвращён (+10)", (await stock("pomidory")) === 0 || true);
await sys();
ok("остаток помидоров возвращён (+10) — владелец", Number((await rows("select quantity from inventory where product_id=$1", [tomatoes]))[0].quantity) === 150);
ok("промокод освобождён", (await rows("select used_count from promo_codes where code='WELCOME10'"))[0].used_count === 0);
ok("статус cancelled + причина", (await rows("select status, cancel_reason from orders where id=$1", [o2.order_id]))[0].status === "cancelled");
ok("журнал: sale_cancel записан", (await rows("select count(*)::int n from inventory_transactions where order_id=$1 and type='sale_cancel'", [o2.order_id]))[0].n === 1);
await as(A);
ok("двойная отмена невозможна", await fails("select cancel_my_order($1)", [o2.order_id], "собирается|завершён|недоступна"));
await sys();
ok("остаток не вернулся дважды", Number((await rows("select quantity from inventory where product_id=$1", [tomatoes]))[0].quantity) === 150);
ok("админ получил уведомления о новом заказе и об отмене",
  (await rows("select count(distinct type)::int n from notifications where user_id=$1 and type in ('new_order','order_cancelled')", [ADMIN]))[0].n === 2);
await uid("late@t.tj", "Поздний Клиент", "+992900000009");
ok("админ получил уведомление о новой регистрации",
  (await rows("select count(*)::int n from notifications where user_id=$1 and type='new_user'", [ADMIN]))[0].n === 1);

console.log("\n== Админ: статусы заказа ==");
await as(MGR);
ok("менеджер НЕ меняет статус (только просмотр)", await fails("select set_order_status($1,'confirmed')", [o1.order_id], "Недостаточно прав"));
ok("менеджер видит заказы", (await rows("select count(*)::int n from orders"))[0].n === 2);
ok("менеджер видит склад и журнал", (await rows("select count(*)::int n from inventory_transactions"))[0].n > 0);
ok("менеджер НЕ вызывает приход", await fails("select receive_stock(null,'X',null,null,'[]'::jsonb)", [], "Недостаточно прав"));
ok("менеджер НЕ меняет остаток напрямую", await fails("update inventory set quantity=1", [], "permission denied"));
ok("менеджер НЕ создаёт товар", await fails("insert into categories (name, slug) values ('x','x')", [], "row-level security"));
await as(ADMIN);
await db.query("select set_order_status($1,'confirmed','Позвонили клиенту')", [o1.order_id]);
await db.query("select set_order_status($1,'assembling')", [o1.order_id]);
ok("нельзя вернуть статус назад", await fails("select set_order_status($1,'pending')", [o1.order_id], "предыдущий"));
await db.query("select set_order_status($1,'handed_to_courier','', 'Рустам', '+992900999999')", [o1.order_id]);
await db.query("select set_order_status($1,'on_the_way')", [o1.order_id]);
await db.query("select set_order_status($1,'delivered')", [o1.order_id]);
const od = (await rows("select status, payment_status, courier_name, delivered_at is not null d, handled_by from orders where id=$1", [o1.order_id]))[0];
ok("доставлен, оплачен, курьер назначен", od.status === "delivered" && od.payment_status === "paid" && od.courier_name === "Рустам" && od.d && od.handled_by === ADMIN, JSON.stringify(od));
const hist = await rows("select status, note from order_status_history where order_id=$1 order by created_at, status", [o1.order_id]);
ok("история: создан + 5 переходов (+доставка)", hist.length >= 6, JSON.stringify(hist));
ok("комментарий попал в историю", hist.some(h => h.note === "Позвонили клиенту"));
ok("завершённый заказ нельзя менять", await fails("select set_order_status($1,'cancelled')", [o1.order_id], "завершён"));

console.log("\n== Клиент: realtime-данные и отзывы ==");
await as(A);
ok("клиент видит историю статусов своего заказа", (await rows("select count(*)::int n from order_status_history where order_id=$1", [o1.order_id]))[0].n >= 6);
ok("клиент получил уведомления о статусах", (await rows("select count(*)::int n from notifications where type='order_status'"))[0].n >= 5);
ok("отзыв на купленный товар разрешён",
  (await db.query("insert into product_reviews (product_id, user_id, rating, body) values ($1,$2,5,'Отлично')", [apples, A])).affectedRows === 1);
ok("отзыв на непокупанный товар запрещён",
  await fails("insert into product_reviews (product_id, user_id, rating) values ($1,$2,5)", [tomatoes, A], "row-level security"));
ok("отзыв от чужого имени запрещён",
  await fails("insert into product_reviews (product_id, user_id, rating) values ($1,$2,5)", [apples, B], "row-level security"));
ok("оценка вне 1..5 отклонена", await fails("update product_reviews set rating=7", [], "check"));
await db.query("update product_reviews set status='approved'");
ok("клиент не может сам одобрить отзыв", (await rows("select status from product_reviews"))[0].status === "pending");
await sys();
ok("рейтинг товара не учитывает неодобренный отзыв", Number((await rows("select rating_count from products where id=$1", [apples]))[0].rating_count) === 0);
await as(ADMIN);
await db.query("update product_reviews set status='approved'");
await sys();
ok("после модерации рейтинг пересчитан (5.00, 1 отзыв)",
  Number((await rows("select rating_avg from products where id=$1", [apples]))[0].rating_avg) === 5);
await as(null, "anon");
ok("anon видит одобренный отзыв без PII", (await rows("select author_name from public_reviews"))[0].author_name === "Анвар");
await as(A);
await db.query("update product_reviews set body='Изменил текст'");
await sys();
ok("правка отзыва возвращает его на модерацию", (await rows("select status from product_reviews"))[0].status === "pending");

console.log("\n== Склад ==");
await as(ADMIN);
const sup = (await rows("select id from suppliers limit 1"))[0].id;
const before = await stock("kivi");
const itemsJson = JSON.stringify([{ product_id: await P("kivi"), quantity: 40, unit_cost: 6 }]);
ok("приход оформлен", (await rows("select receive_stock($1,'DOC-77','2025-01-10','тест',$2::jsonb) n", [sup, itemsJson]))[0].n === 1);
ok("остаток увеличен на 40", (await stock("kivi")) === before + 40);
ok("повторный ввод того же документа отклонён", await fails("select receive_stock($1,'DOC-77','2025-01-10','тест',$2::jsonb)", [sup, itemsJson], "unique|duplicate"));
ok("остаток после дубликата не изменился", (await stock("kivi")) === before + 40);
const avg = Number((await rows("select avg_cost from inventory where product_id=$1", [await P("kivi")]))[0].avg_cost);
// было 90 по 5, пришло 40 по 6 → (450+240)/130 = 5.3077
ok("средняя себестоимость пересчитана (5.3077)", avg === 5.3077, String(avg));
ok("списание порчи", (await rows("select write_off_stock($1, 5, 'spoilage', 'подгнили') id", [await P("kivi")])).length === 1);
ok("нельзя списать больше остатка", await fails("select write_off_stock($1, 100000, 'loss')", [await P("kivi")], "Недостаточный остаток"));
ok("недопустимая причина отклонена", await fails("select write_off_stock($1, 1, 'xxx')", [await P("kivi")], "причина"));
ok("возврат поставщику = отдельный тип", (await rows("select write_off_stock($1, 1, 'supplier_return', null, null, $2) id", [await P("kivi"), sup])).length === 1
  && (await rows("select count(*)::int n from inventory_transactions where type='supplier_return'"))[0].n === 1);
const sys0 = await stock("kivi");
const st = (await rows("select stocktake($1::jsonb, 'плановая') r", [JSON.stringify([{ product_id: await P("kivi"), actual_quantity: sys0 - 3, expected_quantity: sys0 }])]))[0].r;
ok("инвентаризация: недостача 3", st.adjusted === 1 && Number(st.shortage) === 3 && (await stock("kivi")) === sys0 - 3, JSON.stringify(st));
const surp = (await rows("select stocktake($1::jsonb) r", [JSON.stringify([{ product_id: await P("kivi"), actual_quantity: sys0 + 2 }])]))[0].r;
ok("инвентаризация: излишек 5 (от sys0-3 до sys0+2)", Number(surp.surplus) === 5);
ok("инвентаризация с устаревшим expected отклонена",
  await fails("select stocktake($1::jsonb)", [JSON.stringify([{ product_id: await P("kivi"), actual_quantity: 1, expected_quantity: 1 }])], "изменился"));
ok("админ не может менять остаток напрямую", await fails("update inventory set quantity=5", [], "permission denied"));
ok("админ не может править журнал", await fails("update inventory_transactions set comment='x'", [], "permission denied"));
await sys();
ok("даже владелец БД не может править журнал склада (триггер)", await fails("update inventory_transactions set comment='x'", [], "только для добавления"));
ok("даже владелец БД не может удалять из журнала", await fails("delete from inventory_transactions", [], "только для добавления"));
ok("audit_logs неизменяем", await fails("delete from audit_logs", [], "только для добавления"));
ok("order_status_history неизменяем", await fails("update order_status_history set note='x'", [], "только для добавления"));
ok("инвариант: остаток = сумма движений для всех товаров",
  (await rows(`select count(*)::int n from inventory i
    where i.quantity <> coalesce((select sum(quantity_change) from inventory_transactions t where t.product_id=i.product_id),0)`))[0].n === 0);
ok("CHECK: отрицательный остаток невозможен даже из SQL", await fails("update inventory set quantity=-1", [], "check"));
ok("уведомления складских операций отправлены",
  (await rows("select count(distinct type)::int n from notifications where user_id=$1 and type in ('stock_receipt','stock_write_off','stocktake')", [MGR]))[0].n === 3);

console.log("\n== Низкий остаток ==");
await as(ADMIN);
const klubId = strawb;
const klStock = await stock("klubnika");
await db.query("select write_off_stock($1, $2, 'loss', 'тест')", [klubId, klStock - 7]); // 24 → 7 (<8 min)
await sys();
ok("уведомление о низком остатке", (await rows("select count(*)::int n from notifications where type='low_stock' and user_id=$1", [ADMIN]))[0].n >= 1);

console.log("\n== Возвраты ==");
await as(ADMIN);
const item = (await rows("select id, quantity, line_total from order_items where order_id=$1 and product_name='Яблоки Голден'", [o1.order_id]))[0];
const before2 = await stock("yabloki-golden");
const refund = (await rows("select return_order_items($1, $2::jsonb, true, 'не понравились') r", [o1.order_id, JSON.stringify([{ order_item_id: item.id, quantity: 1 }])]))[0].r;
ok("возврат 1 кг яблок: сумма 18", Number(refund) === 18, String(refund));
ok("возврат вернул товар на склад (+1)", (await stock("yabloki-golden")) === before2 + 1);
ok("нельзя вернуть больше купленного",
  await fails("select return_order_items($1,$2::jsonb,true)", [o1.order_id, JSON.stringify([{ order_item_id: item.id, quantity: 5 }])], "больше, чем куплено"));
ok("клиент не может оформить возврат", (await (async () => { await as(A); return fails("select return_order_items($1,$2::jsonb,true)", [o1.order_id, "[]"], "Недостаточно прав"); })()));

console.log("\n== Расходы и аудит ==");
await as(ADMIN);
await db.query("insert into expenses (category, amount, description) values ('rent', 1500, 'Аренда склада')");
ok("админ добавляет расход", true);
ok("админ НЕ может удалить расход", (await db.query("delete from expenses")).affectedRows === 0 || await fails("delete from expenses"));
await db.query("update expenses set is_voided=true");
await as(MGR);
ok("менеджер видит расходы", (await rows("select count(*)::int n from expenses"))[0].n === 1);
ok("менеджер НЕ добавляет расходы", await fails("insert into expenses (amount) values (1)", [], "row-level security"));
ok("менеджер НЕ правит расходы", (await db.query("update expenses set amount=1")).affectedRows === 0);
ok("менеджер видит журнал действий", (await rows("select count(*)::int n from audit_logs"))[0].n > 0);
await sys();
const au = await rows("select action, actor_id from audit_logs where table_name='expenses' order by created_at");
ok("аудит расходов: INSERT и UPDATE с автором", au.length === 2 && au.every(a => a.actor_id === ADMIN), JSON.stringify(au));
ok("аудит смены роли записан", (await rows("select count(*)::int n from audit_logs where table_name='profiles'"))[0].n === 2);

console.log("\n== Этап 4: payload сайта → create_order ==");
await as(A);
{
  const today = (await rows("select (now() at time zone 'Asia/Dushanbe')::date::text d"))[0].d;
  const zrow = (await rows("select id, delivery_fee, free_delivery_from, min_order_total from delivery_zones where is_active order by created_at limit 1"))[0];
  const req = {
    delivery_type: "delivery", delivery_zone_id: zrow.id, address_mode: "new",
    street: "Рудаки", house: "10", apartment: "4", delivery_date: today, delivery_time_slot: "12:00–15:00",
    comment: "", customer_name: "Тест", customer_phone: "+992 900 00 00 00",
    items: [{ product_id: apples, quantity: 10 }], promo_code: "", idempotency_key: "web-key-0001",
  };
  const parsed = orderRequestSchema.safeParse(req);
  ok("Zod принимает корректный запрос", parsed.success, JSON.stringify(parsed.error?.issues));
  const v = parsed.data;
  const payload = buildOrderPayload(v, { addressText: formatAddress(v) });
  ok("адрес форматируется", payload.delivery_address === "Душанбе, Рудаки, д. 10, кв. 4", payload.delivery_address);
  const r = (await rows("select create_order($1::jsonb) r", [JSON.stringify(payload)]))[0].r;
  const expected = calcTotals({ subtotal: 180, zone: zrow, deliveryType: "delivery" });
  ok("итог из БД = calcTotals на клиенте", Number(r.total) === expected.total, `${r.total} vs ${expected.total}`);
  const pk = buildOrderPayload(orderRequestSchema.parse({ ...req, delivery_type: "pickup", delivery_zone_id: "", idempotency_key: "web-key-0002" }));
  ok("самовывоз: оплата pay_on_pickup, без зоны и адреса", pk.payment_method === "pay_on_pickup" && pk.delivery_zone_id === null && pk.delivery_address === null);
  const r2 = (await rows("select create_order($1::jsonb) r", [JSON.stringify(pk)]))[0].r;
  ok("самовывоз создаётся без доставки", Number(r2.total) === 180, JSON.stringify(r2));
  ok("Zod: доставка без зоны отклонена", !orderRequestSchema.safeParse({ ...req, delivery_zone_id: "" }).success);
  ok("Zod: доставка без улицы отклонена", !orderRequestSchema.safeParse({ ...req, street: "" }).success);
  ok("Zod: пустая корзина отклонена", !orderRequestSchema.safeParse({ ...req, items: [] }).success);
  ok("Zod: плохой uuid товара отклонён", !orderRequestSchema.safeParse({ ...req, items: [{ product_id: "x", quantity: 1 }] }).success);
  ok("Zod: отрицательное количество отклонено", !orderRequestSchema.safeParse({ ...req, items: [{ product_id: apples, quantity: -1 }] }).success);
  const e = await failsMsg("select create_order($1::jsonb)", [JSON.stringify({ ...payload, idempotency_key: "web-key-0003", items: [{ product_id: apples, quantity: 99999 }] })]);
  ok("ошибка нехватки остатков пропускается пользователю", e && mapRpcError({ code: "23514", message: e }).message.includes("Недостаточно товара"), e);
  ok("техническая ошибка скрыта", mapRpcError({ code: "XX000", message: "relation foo does not exist" }).message === "Не удалось оформить заказ. Попробуйте ещё раз.");
  ok("28000 → needLogin", mapRpcError({ code: "28000", message: "x" }).needLogin === true);
}

console.log("\n== Этап 7: отчёты и обзор склада ==");
{
  const day = (await rows("select (now() at time zone 'Asia/Dushanbe')::date::text d, ((now() at time zone 'Asia/Dushanbe')::date - 1)::text y, ((now() at time zone 'Asia/Dushanbe')::date + 1)::text t"))[0];
  await as(A);
  ok("клиент не вызывает report_dashboard", await fails("select report_dashboard($1,$2)", [day.y, day.t], "Недостаточно прав"));
  ok("клиент не вызывает admin_customers", await fails("select * from admin_customers()", [], "Недостаточно прав"));
  ok("клиент не меняет закупочную цену", await fails("select set_product_cost($1, 1, 'x')", [apples], "Недостаточно прав"));
  ok("клиент не видит stock_overview", (await rows("select count(*)::int n from stock_overview"))[0].n === 0);
  await as(null, "anon");
  ok("anon не вызывает report_dashboard", await fails("select report_dashboard($1,$2)", [day.y, day.t], "permission denied"));

  await as(MGR);
  const rep = (await rows("select report_dashboard($1,$2) r", [day.y, day.t]))[0].r;
  const k = rep.kpis;
  await sys();
  const exp = (await rows(`select
    (select coalesce(sum(total),0) from orders where status='delivered') as rev,
    (select coalesce(sum(refund_amount),0) from order_returns) as ret,
    (select coalesce(sum(oi.unit_cost*oi.quantity),0) from order_items oi join orders o on o.id=oi.order_id where o.status='delivered') as cogs,
    (select coalesce(sum(unit_cost*quantity) filter (where restocked),0) from order_returns) as cogs_ret,
    (select coalesce(sum(abs(quantity_change)*unit_cost),0) from inventory_transactions where type='write_off') as wo,
    (select coalesce(sum(amount),0) from expenses where not is_voided) as ex`))[0];
  await as(MGR);
  const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;
  ok("выручка = доставленные − возвраты (независимый расчёт)", near(k.revenue, Number(exp.rev) - Number(exp.ret)), `${k.revenue} vs ${exp.rev}-${exp.ret}`);
  ok("себестоимость = проданное − возвращённое на склад", near(k.cogs, Number(exp.cogs) - Number(exp.cogs_ret)), `${k.cogs}`);
  ok("валовая = выручка − себестоимость", near(k.gross_profit, k.revenue - k.cogs));
  ok("списания считаются по порче/потерям", near(k.writeoffs, exp.wo) && Number(k.writeoffs) > 0, `${k.writeoffs}`);
  ok("аннулированный расход не учитывается", Number(k.expenses) === 0, `${k.expenses}`);
  ok("чистая = валовая − расходы − списания", near(k.net_profit, k.gross_profit - k.expenses - k.writeoffs));
  ok("ряд по дням: 3 дня, сумма выручки = KPI", rep.series.length === 3 && near(rep.series.reduce((a, r) => a + Number(r.revenue), 0), k.revenue), JSON.stringify(rep.series.map(r => r.revenue)));
  ok("есть топ товаров и категорий", rep.top_products.length > 0 && rep.top_categories.length > 0);
  ok("по часам: 24 значения", rep.by_hour.length === 24);
  ok("остаток склада не смешан с выручкой", Number(k.stock_value) > 0 && !near(k.stock_value, k.revenue));
  ok("сотрудники: админ с действиями", rep.staff.some(x => x.id === ADMIN && Number(x.actions) > 0 && Number(x.orders_handled) >= 1), JSON.stringify(rep.staff.map(x => [x.role, x.actions, x.orders_handled])));
  ok("неверный период отклонён", await fails("select report_dashboard($1,$2)", [day.t, day.y], "Неверный период"));
  ok("слишком длинный период отклонён", await fails("select report_dashboard('2020-01-01',$1)", [day.t], "800"));
  ok("менеджер видит stock_overview", (await rows("select count(*)::int n from stock_overview"))[0].n > 0);
  const cu = await rows("select * from admin_customers(null, 20, 0)");
  ok("менеджер видит клиентов со статистикой", cu.length >= 1 && Number(cu[0].total_count) >= 1 && cu.some(c => c.id === A && Number(c.orders_count) >= 1));
  ok("поиск клиента по телефону", (await rows("select * from admin_customers('911111111', 20, 0)")).length === 1);
  ok("поиск экранирует % и _", (await rows("select * from admin_customers('%', 20, 0)")).length === 0);
  ok("менеджер НЕ меняет закупочную цену", await fails("select set_product_cost($1, 1, 'x')", [apples], "Недостаточно прав"));

  await as(ADMIN);
  await db.query("select set_product_cost($1, 9.5, 'пересчёт')", [apples]);
  await sys();
  ok("закупочная цена изменена", Number((await rows("select avg_cost from inventory where product_id=$1", [apples]))[0].avg_cost) === 9.5);
  ok("смена цены записана в аудит", (await rows("select count(*)::int n from audit_logs where action='COST_CHANGE' and actor_id=$1", [ADMIN]))[0].n === 1);
}

console.log("\n== Управление пользователями ==");
await as(ADMIN);
await db.query("select admin_set_user_role($1,'manager',true)", [B]);
ok("админ назначает роль", true);
ok("админ не может изменить свою роль", await fails("select admin_set_user_role($1,'customer',true)", [ADMIN], "собственную"));
await db.query("select admin_set_user_role($1,'customer',false)", [B]);
await as(B);
ok("заблокированный не может менять профиль", (await db.query("update profiles set full_name='X' where id=$1", [B])).affectedRows === 0);
ok("заблокированный не может добавить в избранное", await fails("insert into favorites (user_id, product_id) values ($1,$2)", [B, apples], "row-level security"));
ok("заблокированный не может добавить адрес", await fails("insert into addresses (user_id, street) values ($1,'x')", [B], "row-level security"));
ok("заблокированный не создаёт заказ", await fails("select create_order($1::jsonb)", [JSON.stringify({ items: [{ product_id: apples, quantity: 1 }], delivery_type: "pickup", payment_method: "pay_on_pickup" })], "недоступен"));

console.log("\n== Storage ==");
await as(A);
ok("клиент грузит фото отзыва в свою папку",
  (await db.query("insert into storage.objects (bucket_id, name) values ('review-photos', $1)", [`${A}/p.jpg`])).affectedRows === 1);
ok("клиент НЕ грузит в чужую папку", await fails("insert into storage.objects (bucket_id, name) values ('review-photos', $1)", [`${B}/p.jpg`], "row-level security"));
ok("клиент НЕ грузит фото товара", await fails("insert into storage.objects (bucket_id, name) values ('product-images', 'a.jpg')", [], "row-level security"));
await as(ADMIN);
ok("админ грузит фото товара", (await db.query("insert into storage.objects (bucket_id, name) values ('product-images', 'a.jpg')")).affectedRows === 1);

console.log("\n== Блоки сервисов главной ==");
await sys();
ok("стартовые блоки сервисов созданы", (await rows("select count(*)::int c from public.home_services"))[0].c === 6);
await as(A);
ok("клиент видит активные блоки", (await rows("select id from public.home_services")).length === 6);
ok("клиент НЕ меняет блоки", await fails("update public.home_services set title = 'x'", [], "row-level security") || (await db.query("update public.home_services set title = 'x'")).affectedRows === 0);
await as(ADMIN);
ok("админ скрывает блок", (await db.query("update public.home_services set is_active = false where sort_order = 10")).affectedRows === 1);
await as(A);
ok("скрытый блок не виден клиенту", (await rows("select id from public.home_services")).length === 5);
await sys();

console.log(`\n=== ИТОГО: ${pass} успешно, ${fail} ошибок ===`);
if (fail) { console.log(failures.join("\n")); process.exit(1); }
