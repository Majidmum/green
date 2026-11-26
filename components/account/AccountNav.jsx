"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageSquare, Package, User } from "lucide-react";

const ITEMS = [
  { href: "/profile", label: "Профиль", Icon: User },
  { href: "/orders", label: "Мои заказы", Icon: Package },
  { href: "/favorites", label: "Избранное", Icon: Heart },
  { href: "/my-reviews", label: "Мои отзывы", Icon: MessageSquare },
];

export default function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Личный кабинет" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-col">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm sm:justify-start sm:px-4 lg:gap-2.5 font-medium transition lg:rounded-xl ${
              active ? "bg-brand text-white shadow-soft" : "bg-surface text-body/80 shadow-soft hover:bg-tint"
            }`}
          >
            <Icon size={17} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
