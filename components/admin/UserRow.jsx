"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/app/admin/users/actions";
import { formatDate } from "@/lib/utils/format";

const ROLES = [["customer", "Клиент"], ["manager", "Руководитель"], ["admin", "Администратор"]];

export default function UserRow({ user, isSelf }) {
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.is_active);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const dirty = role !== user.role || active !== user.is_active;

  const save = () => start(async () => {
    setMsg(null);
    const r = await setUserRole({ userId: user.id, role, active });
    setMsg(r.ok ? { ok: !r.warning, text: r.warning ?? "Сохранено" } : { ok: false, text: r.error });
    if (!r.ok) { setRole(user.role); setActive(user.is_active); }
  });

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{user.full_name || "—"}{isSelf && <span className="ml-2 rounded-full bg-tint px-2 py-0.5 text-xs text-heading">это вы</span>}<p className="text-xs font-normal text-body/50">{user.email}</p></td>
      <td className="px-4 py-3 text-body/70">{user.phone}</td>
      <td className="px-4 py-3"><select className="input !py-1.5" value={role} disabled={isSelf || pending} onChange={(e) => setRole(e.target.value)} aria-label={`Роль: ${user.full_name}`}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
      <td className="px-4 py-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={active} disabled={isSelf || pending} onChange={(e) => setActive(e.target.checked)} /> Активен</label></td>
      <td className="px-4 py-3 text-xs text-body/60">{formatDate(user.created_at)}</td>
      <td className="px-4 py-3 text-right">
        {dirty && <button className="btn-primary !px-4 !py-1.5 text-xs" disabled={pending} onClick={save}>{pending ? "…" : "Сохранить"}</button>}
        {msg && <p className={`mt-1 text-xs ${msg.ok ? "text-heading" : "text-rose-600"}`} role="status">{msg.text}</p>}
      </td>
    </tr>
  );
}
