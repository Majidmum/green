import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
