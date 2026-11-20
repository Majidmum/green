"use client";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Store, X } from "lucide-react";
import Logo from "@/components/layout/Logo";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_NAV, MANAGER_NAV } from "@/lib/admin/nav";

// Каркас панели (админ и руководитель): боковое меню + верхняя панель. nav — массив групп.
export default function StaffShell({ title, navKey, userName, roleLabel, unread = 0, notificationsHref, children }) {
  const nav = navKey === "manager" ? MANAGER_NAV : ADMIN_NAV;
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href, exact) => (exact ? path === href : path === href || path.startsWith(href + "/"));

  const menu = (
    <nav aria-label={title} className="space-y-5">
      {nav.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, Icon, exact }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href, exact) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive(href, exact) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={17} /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-page lg:flex">
      <aside className="hidden w-64 shrink-0 bg-brand-dark p-4 print:hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-white"><Logo size={40} variant="light" /><span className="font-display text-lg font-bold">Green Garden</span></Link>
          {menu}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-brand-dark p-4">
            <button className="mb-4 rounded-full p-2 text-white hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X size={20} /></button>
            {menu}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-heading/10 bg-surface/90 px-4 py-3 backdrop-blur print:hidden sm:px-6">
          <button className="rounded-full p-2 hover:bg-tint lg:hidden" onClick={() => setOpen(true)} aria-label="Открыть меню"><Menu size={20} /></button>
          <div className="mr-auto">
            <p className="text-sm font-semibold text-heading">{title}</p>
            <p className="text-xs text-body/50">{userName} · {roleLabel}</p>
          </div>
          <ThemeToggle className="rounded-full p-2 hover:bg-tint" />
          {notificationsHref && (
            <Link href={notificationsHref} className="relative rounded-full p-2 hover:bg-tint" aria-label={`Уведомления${unread ? `, непрочитанных: ${unread}` : ""}`}>
              <Bell size={20} />
              {unread > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          )}
          <Link href="/" className="rounded-full p-2 hover:bg-tint" aria-label="На сайт"><Store size={20} /></Link>
          <button className="rounded-full p-2 text-rose-600 hover:bg-rose-50" aria-label="Выйти" onClick={async () => { await createClient().auth.signOut(); router.replace("/"); router.refresh(); }}><LogOut size={20} /></button>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
