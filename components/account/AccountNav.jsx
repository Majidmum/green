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
    <nav aria-label="Личный кабинет" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition lg:rounded-xl ${
              active ? "bg-brand text-white shadow-soft" : "bg-white text-brand-ink/80 shadow-soft hover:bg-brand-light"
            }`}
          >
            <Icon size={17} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
