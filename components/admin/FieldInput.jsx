"use client";

import { Controller } from "react-hook-form";
import ImageUpload from "@/components/admin/ImageUpload";

// Универсальное поле формы по описанию из lib/admin/resources.js
export default function FieldInput({ f, control, register, error, options, id }) {
  const wrap = (child) => (
    <div className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}>
      {f.type !== "checkbox" && <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>}
      {child}
      {f.hint && !error && <p className="mt-1 text-xs text-brand-ink/50">{f.hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );

  switch (f.type) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-brand" {...register(f.name)} /> {f.label}
        </label>
      );
    case "textarea":
      return wrap(<textarea id={id} rows={3} className="input" {...register(f.name)} />);
    case "number":
      return wrap(<input id={id} type="text" inputMode="decimal" className="input" {...register(f.name)} />);
    case "date":
      return wrap(<input id={id} type="date" className="input" {...register(f.name)} />);
    case "datetime":
      return wrap(<input id={id} type="datetime-local" className="input" {...register(f.name)} />);
    case "select":
      return wrap(
        <select id={id} className="input" {...register(f.name)}>
          {!f.required && <option value="">— не выбрано —</option>}
          {(options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "image":
      return wrap(
        <Controller name={f.name} control={control} render={({ field }) => (
          <ImageUpload id={id} value={field.value} onChange={field.onChange} bucket={f.bucket} folder={f.folder} />
        )} />
      );
    default:
      return wrap(<input id={id} type="text" className="input" autoComplete="off" {...register(f.name)} />);
  }
}
