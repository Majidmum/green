"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-outline w-full !text-rose-600 sm:w-auto hover:!border-rose-400"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      <LogOut size={16} /> Выйти из аккаунта
    </button>
  );
}
