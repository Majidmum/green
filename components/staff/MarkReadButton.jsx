"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "@/app/notifications-actions";

export default function MarkReadButton({ count }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="btn-outline !py-2.5" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>
      Отметить все прочитанными ({count})
    </button>
  );
}
