"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { RESOURCES, EXPENSE_CATEGORY_LABELS } from "@/lib/admin/resources";
import { buildSchema, fromRow } from "@/lib/admin/schema";
import { saveResource, deleteResource } from "@/app/admin/actions";
import { formatDate, formatDay, formatMoney } from "@/lib/utils/format";
import Modal from "@/components/admin/Modal";
import FieldInput from "@/components/admin/FieldInput";

function Cell({ col, row, lookups }) {
  const v = row[col.key];
  switch ((col.format ?? "").split(":")[0]) {
    case "bool":
      return v ? <Check size={16} className="text-brand" aria-label="Да" /> : <X size={16} className="text-brand-ink/30" aria-label="Нет" />;
    case "money":
      return v === null || v === undefined ? "—" : formatMoney(v);
    case "datetime":
      return v ? formatDate(v) : "—";
    case "day":
      return v ? formatDay(v) : "—";
    case "discount":
      return row.discount_type === "percent" ? `${Number(v)}%` : formatMoney(v);
    case "lookup":
      return (lookups[col.format.split(":")[1]] ?? []).find((o) => o.value === v)?.label ?? "—";
    case "expcat":
      return EXPENSE_CATEGORY_LABELS[v] ?? v;
    case "voided":
      return v ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Аннулирован</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Учтён</span>;
    default:
      return v === null || v === undefined || v === "" ? "—" : String(v);
  }
}

function ResourceForm({ resourceKey, row, lookups, onDone }) {
  const res = RESOURCES[resourceKey];
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const {
    register, control, handleSubmit, setError: setFieldError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(buildSchema(res)), defaultValues: fromRow(res, row) });

  const onSubmit = (values) =>
    start(async () => {
      setError("");
      const r = await saveResource(resourceKey, row?.id ?? null, values);
      if (!r.ok) {
        if (r.field) setFieldError(r.field, { message: r.error });
        else setError(r.error);
        return;
      }
      onDone(true);
    });

  const optionsFor = (f) => {
    if (f.options) return f.options;
    const list = lookups[f.optionsFrom] ?? [];
    return f.excludeSelf && row ? list.filter((o) => o.value !== row.id) : list;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {res.fields.map((f) => (
          <FieldInput key={f.name} f={f} id={`f-${f.name}`} control={control} register={register} error={errors[f.name]?.message} options={f.type === "select" ? optionsFor(f) : undefined} />
        ))}
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
        <button type="button" className="btn-outline" onClick={() => onDone(false)}>Отмена</button>
      </div>
    </form>
  );
}

export default function ResourceManager({ resourceKey, rows, lookups = {} }) {
  const res = RESOURCES[resourceKey];
  const router = useRouter();
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => res.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s)));
  }, [q, rows, res]);

  const remove = (row) => {
    const msg = res.voidInsteadOfDelete ? "Аннулировать расход? Он перестанет учитываться в прибыли, но останется в истории." : "Удалить запись?";
    if (!confirm(msg)) return;
    start(async () => {
      setError("");
      const r = await deleteResource(resourceKey, row.id);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" />
          <input className="input !pl-9" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск" />
        </div>
        <button className="btn-primary ml-auto !py-2.5" onClick={() => setEditing("new")}><Plus size={16} /> Добавить</button>
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-dark/10 text-xs uppercase tracking-wide text-brand-ink/50">
            <tr>{res.columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>)}<th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-brand-dark/5">
            {shown.length === 0 && <tr><td colSpan={res.columns.length + 1} className="px-4 py-10 text-center text-brand-ink/50">Записей нет</td></tr>}
            {shown.map((row) => (
              <tr key={row.id} className={row.is_voided ? "opacity-50" : ""}>
                {res.columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.strong ? "font-semibold" : ""} ${c.muted ? "text-brand-ink/60" : ""}`}><Cell col={c} row={row} lookups={lookups} /></td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {!row.is_voided && (
                    <>
                      <button className="rounded-full p-2 text-brand hover:bg-brand-light" aria-label="Изменить" onClick={() => setEditing(row)}><Pencil size={15} /></button>
                      <button className="rounded-full p-2 text-rose-600 hover:bg-rose-50" aria-label={res.voidInsteadOfDelete ? "Аннулировать" : "Удалить"} disabled={pending} onClick={() => remove(row)}>
                        {res.voidInsteadOfDelete ? <Ban size={15} /> : <Trash2 size={15} />}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === "new" ? `Новая: ${res.singular}` : `Изменить: ${res.singular}`} onClose={() => setEditing(null)} wide>
          <ResourceForm
            resourceKey={resourceKey}
            row={editing === "new" ? null : editing}
            lookups={lookups}
            onDone={(saved) => { setEditing(null); if (saved) router.refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}
