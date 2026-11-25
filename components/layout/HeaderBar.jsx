"use client";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/layout/Logo";
import { Heart, LogOut, Menu, Package, Search, ShoppingBasket, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cartCount, useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";

const NAV = [
  { href: "/catalog", label: "Каталог" },
  { href: "/categories", label: "Категории" },
  { href: "/catalog?sale=1", label: "Акции" },
  { href: "/about", label: "О нас" },
  { href: "/contacts", label: "Контакты" },
];

export default function HeaderBar({ account }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const count = useCart(cartCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [q, setQ] = useState("");
  const userRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") { setUserOpen(false); setMenuOpen(false); }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function onSearch(e) {
    e.preventDefault();
    const term = q.trim();
    setMenuOpen(false);
    router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : "/catalog");
  }

  async function signOut() {
    await createClient().auth.signOut();
    setUserOpen(false);
    router.push("/");
    router.refresh();
  }

  const iconBtn =
    "relative flex h-11 w-11 items-center justify-center rounded-full text-heading transition hover:bg-tint";
  const menuItem = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-tint";

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0 border-b-heading/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <button className={`${iconBtn} lg:hidden`} onClick={() => setMenuOpen((v) => !v)} aria-label="Меню" aria-expanded={menuOpen}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-heading">
          <Logo size={44} priority />
          <span className="hidden sm:inline">GREEN GARDEN</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-body/80 transition hover:bg-tint hover:text-heading">
              {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Найти товар"
              maxLength={80}
              className="input !rounded-full !py-2.5 pr-10"
              aria-label="Поиск товаров"
            />
            <button type="submit" className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-brand" aria-label="Искать">
              <Search size={17} />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeToggle className={iconBtn} />
          <Link href="/favorites" className={iconBtn} aria-label="Избранное"><Heart size={21} /></Link>
          <Link href="/cart" className={iconBtn} aria-label={`Корзина${hydrated && count ? `, позиций: ${count}` : ""}`}>
            <ShoppingBasket size={21} />
            {hydrated && count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {account ? (
            <div className="relative" ref={userRef}>
              <button className={iconBtn} onClick={() => setUserOpen((v) => !v)} aria-label="Аккаунт" aria-expanded={userOpen}>
                <User size={21} />
              </button>
              {userOpen && (
                <div className="card absolute right-0 top-12 w-64 p-2" role="menu">
                  <div className="border-b border-heading/10 px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-semibold">{account.name}</p>
                    <p className="truncate text-xs text-body/60">{account.email}</p>
                  </div>
                  <Link href="/profile" className={menuItem} onClick={() => setUserOpen(false)}><User size={16} /> Профиль</Link>
                  <Link href="/orders" className={menuItem} onClick={() => setUserOpen(false)}><Package size={16} /> Мои заказы</Link>
                  <Link href="/favorites" className={menuItem} onClick={() => setUserOpen(false)}><Heart size={16} /> Избранное</Link>
                  {account.role === "admin" && (
                    <Link href="/admin" className={`${menuItem} font-semibold text-brand`} onClick={() => setUserOpen(false)}>Панель администратора</Link>
                  )}
                  {account.role === "manager" && (
                    <Link href="/manager" className={`${menuItem} font-semibold text-brand`} onClick={() => setUserOpen(false)}>Панель руководителя</Link>
                  )}
                  <button onClick={signOut} className={`${menuItem} w-full text-rose-600`}><LogOut size={16} /> Выйти</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary ml-1 !px-5 !py-2.5">Войти</Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-heading/10 bg-page px-4 pb-4 pt-3 lg:hidden">
          <form onSubmit={onSearch} className="mb-3" role="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти товар" maxLength={80} className="input" aria-label="Поиск товаров" />
          </form>
          <nav className="grid gap-1" aria-label="Мобильная навигация">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-base font-medium hover:bg-tint">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
