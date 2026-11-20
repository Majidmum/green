import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import MarkReadButton from "@/components/staff/MarkReadButton";

export default async function NotificationsList({ userId, orderBase }) {
  const { data, error } = await createClient().from("notifications").select("id,type,title,body,data,is_read,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const unread = (data ?? []).filter((n) => !n.is_read).length;
  return (
    <div className="space-y-4">
      {unread > 0 && <MarkReadButton count={unread} />}
      {!data?.length ? <div className="card p-10 text-center text-body/50">Уведомлений пока нет</div> : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={`card flex items-start gap-3 p-4 ${n.is_read ? "opacity-70" : "border-l-4 border-brand"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-body/70">{n.body}</p>}
                {n.data?.order_id && orderBase && <a className="text-sm text-brand hover:underline" href={`${orderBase}/${n.data.order_id}`}>Открыть заказ</a>}
              </div>
              <time className="shrink-0 text-xs text-body/50" dateTime={n.created_at}>{formatDate(n.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
