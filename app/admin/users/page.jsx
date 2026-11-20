import Link from "next/link";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/supabase/roles";
import { escapeLike } from "@/lib/utils/catalog-params";
import PageHeader from "@/components/admin/PageHeader";
import UserRow from "@/components/admin/UserRow";
import SimplePagination from "@/components/ui/SimplePagination";

export const metadata = { title: "Пользователи и роли" };
const PAGE_SIZE = 25;

export default async function UsersPage({ searchParams }) {
  const { supabase, user } = await requireRole(["admin"]);
  const q = String(searchParams?.q ?? "").trim().slice(0, 80);
  const role = ["customer", "manager", "admin"].includes(searchParams?.role) ? searchParams.role : "";
  const page = Math.max(parseInt(searchParams?.page, 10) || 1, 1);

  let query = supabase.from("profiles").select("id,full_name,email,phone,role,is_active,created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);
  if (q) { const s = escapeLike(q).replace(/[,()]/g, " "); query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`); }
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`Supabase: ${error.message}`);

  return (
    <>
      <PageHeader title="Пользователи и роли" description="Руководителю доступны аналитика и просмотр данных без права изменения. Заблокированный пользователь не может войти и оформлять заказы. Себя изменить нельзя." />
      <form method="get" className="card mb-4 flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[14rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body/40" /><input name="q" defaultValue={q} className="input !pl-9" placeholder="Имя, email или телефон" aria-label="Поиск" /></div>
        <select name="role" defaultValue={role} className="input !w-auto" aria-label="Роль"><option value="">Все роли</option><option value="customer">Клиенты</option><option value="manager">Руководители</option><option value="admin">Администраторы</option></select>
        <button className="btn-primary !py-2.5">Применить</button><Link href="/admin/users" className="btn-outline !py-2.5">Сбросить</Link>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-heading/10 text-xs uppercase tracking-wide text-body/50"><tr><th className="px-4 py-3">Пользователь</th><th className="px-4 py-3">Телефон</th><th className="px-4 py-3">Роль</th><th className="px-4 py-3">Доступ</th><th className="px-4 py-3">Регистрация</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-heading/5">
            {!data?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-body/50">Пользователей не найдено</td></tr>}
            {(data ?? []).map((u) => <UserRow key={u.id} user={u} isSelf={u.id === user.id} />)}
          </tbody>
        </table>
      </div>
      <SimplePagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/users" query={{ q, role }} />
    </>
  );
}
