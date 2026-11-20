import { ORDER_STATUSES } from "@/lib/constants";

const STYLES = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  assembling: "bg-indigo-100 text-indigo-800",
  ready: "bg-violet-100 text-violet-800",
  handed_to_courier: "bg-fuchsia-100 text-fuchsia-800",
  on_the_way: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-700",
};

export function statusLabel(status) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {statusLabel(status)}
    </span>
  );
}
