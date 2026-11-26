import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
