import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/account/ProfileForm";
import PasswordForm from "@/components/account/PasswordForm";
import AddressManager from "@/components/account/AddressManager";
import SignOutButton from "@/components/account/SignOutButton";

export const metadata = { title: "Профиль", robots: { index: false } };

function Section({ title, children }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-brand-dark">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [{ data: profile, error: e1 }, { data: addresses, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,email").eq("id", user.id).maybeSingle(),
    supabase.from("addresses").select("id,label,city,street,house,apartment,entrance,floor,note,is_default")
      .eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (e1 || e2) throw new Error(`Supabase: ${(e1 || e2).message}`);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold text-brand-dark">Профиль</h1>
      <Section title="Личные данные">
        <ProfileForm initial={{ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" }} email={profile?.email ?? user.email} />
      </Section>
      <Section title="Адреса доставки"><AddressManager addresses={addresses ?? []} /></Section>
      <Section title="Смена пароля"><PasswordForm /></Section>
      <SignOutButton />
    </div>
  );
}
