import { z } from "zod";

// Часовой пояс магазина фиксирован: Душанбе, UTC+5, без перехода на летнее время.
const TZ_OFFSET = "+05:00";

export function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}
export function localInputToIso(v) {
  if (!v) return null;
  const d = new Date(`${v}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function fieldSchema(f) {
  const req = "Обязательное поле";
  switch (f.type) {
    case "checkbox":
      return z.boolean().default(false);
    case "number": {
      let n = z.number({ invalid_type_error: "Введите число", required_error: req });
      if (f.int) n = n.int("Целое число");
      if (f.min !== undefined) n = n.min(f.min, `Не меньше ${f.min}`);
      if (f.max !== undefined) n = n.max(f.max, `Не больше ${f.max}`);
      const pre = (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : typeof v === "string" ? Number(v.replace(",", ".")) : v);
      return f.required ? z.preprocess(pre, z.number({ invalid_type_error: req, required_error: req }).pipe(n)) : z.preprocess(pre, n.nullable());
    }
    case "select": {
      const base = f.options ? z.enum(f.options.map((o) => o.value)) : z.string().uuid();
      return f.required ? base : z.union([base, z.literal(""), z.null()]).optional();
    }
    case "date": {
      const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату");
      return f.required ? d : z.union([d, z.literal(""), z.null()]).optional();
    }
    case "datetime": {
      const d = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Укажите дату и время");
      return f.required ? d : z.union([d, z.literal(""), z.null()]).optional();
    }
    default: {
      let s = z.string().trim().max(f.max ?? (f.type === "textarea" ? 2000 : 300), "Слишком длинное значение");
      if (f.pattern) s = s.regex(new RegExp(f.pattern), f.patternMsg ?? "Недопустимые символы");
      if (f.email) s = s.refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Введите корректный email");
      if (f.required) return s.min(1, req);
      return z.union([s, z.literal(""), z.null()]).optional();
    }
  }
}

export function buildSchema(resource) {
  const shape = {};
  for (const f of resource.fields) shape[f.name] = fieldSchema(f);
  let schema = z.object(shape);
  if (resource.refine === "discount") {
    schema = schema.superRefine((v, ctx) => {
      if (v.discount_type === "percent" && Number(v.discount_value) > 100) {
        ctx.addIssue({ code: "custom", path: ["discount_value"], message: "Процент не может быть больше 100" });
      }
      const a = v.starts_at, b = v.expires_at ?? v.ends_at;
      if (a && b && localInputToIso(a) >= localInputToIso(b)) {
        ctx.addIssue({ code: "custom", path: [v.expires_at !== undefined ? "expires_at" : "ends_at"], message: "Окончание должно быть позже начала" });
      }
    });
  }
  return schema;
}

// Значения формы → строка таблицы
export function toRow(resource, values) {
  const row = {};
  for (const f of resource.fields) {
    let v = values[f.name];
    if (f.type === "checkbox") v = Boolean(v);
    else if (f.type === "datetime") v = localInputToIso(v);
    else if (f.type === "number") v = v === "" || v === undefined ? null : v;
    else if (v === "" || v === undefined) v = f.required ? "" : null;
    if (f.upper && typeof v === "string") v = v.toUpperCase();
    row[f.name] = v;
  }
  return row;
}

// Строка таблицы → значения формы
export function fromRow(resource, row) {
  const v = {};
  for (const f of resource.fields) {
    const x = row?.[f.name];
    if (f.type === "checkbox") v[f.name] = x ?? f.default ?? false;
    else if (f.type === "datetime") v[f.name] = isoToLocalInput(x);
    else if (x === null || x === undefined) v[f.name] = f.default !== undefined && !row ? f.default : "";
    else v[f.name] = x;
  }
  return v;
}
