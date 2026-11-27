"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Wand2 } from "lucide-react";
import { productSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils/slugify";
import { deleteProduct, saveProduct } from "@/app/admin/products/actions";
import { UNITS } from "@/lib/constants";

function F({ id, label, error, hint, children, span }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-body/50">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}

export default function ProductForm({ product, categories, cost }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const {
    register, handleSubmit, setValue, getValues, setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "", slug: product?.slug ?? "", category_id: product?.category_id ?? "",
      description: product?.description ?? "", price: product?.price ?? "", old_price: product?.old_price ?? "",
      unit: product?.unit ?? "kg", step: product?.step ?? 1, min_stock: product?.min_stock ?? 0,
      country_of_origin: product?.country_of_origin ?? "",
      is_active: product?.is_active ?? true, is_featured: product?.is_featured ?? false,
      is_new: product?.is_new ?? false, is_seasonal: product?.is_seasonal ?? false,
      cost: cost ?? "",
    },
  });

  const onSubmit = (values) =>
    start(async () => {
      setMsg(null);
      const r = await saveProduct(product?.id ?? null, values);
      if (!r.ok) {
        if (r.field) setError(r.field, { message: r.error });
        setMsg({ ok: false, text: r.error });
        if (r.id) router.replace(`/admin/products/${r.id}`);
        return;
      }
      if (!product) return router.replace(`/admin/products/${r.id}?created=1`);
      setMsg({ ok: true, text: "Товар сохранён" });
      router.refresh();
    });

  const onDelete = () => {
    if (!confirm("Удалить товар? Если по нему есть движения на складе, он будет скрыт с сайта, но останется в истории.")) return;
    start(async () => {
      const r = await deleteProduct(product.id);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      if (r.hidden) { setMsg({ ok: true, text: "У товара есть история движений — он скрыт с витрины, но не удалён." }); router.refresh(); return; }
      router.replace("/admin/products");
    });
  };

  const unit = UNITS;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="card grid gap-4 p-4 sm:p-5 sm:grid-cols-2">
        <F id="p-name" label="Название *" error={errors.name?.message}><input id="p-name" className="input" {...register("name")} /></F>
        <F id="p-slug" label="Адрес (slug) *" error={errors.slug?.message} hint="Часть ссылки на товар">
          <div className="flex gap-2">
            <input id="p-slug" className="input" {...register("slug")} />
            <button type="button" className="btn-outline !px-3" aria-label="Сформировать из названия" onClick={() => setValue("slug", slugify(getValues("name")), { shouldValidate: true })}><Wand2 size={16} /></button>
          </div>
        </F>
        <F id="p-cat" label="Категория *" error={errors.category_id?.message}>
          <select id="p-cat" className="input" {...register("category_id")}>
            <option value="">— выберите —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </F>
        <F id="p-country" label="Страна происхождения"><input id="p-country" className="input" {...register("country_of_origin")} /></F>
        <F id="p-desc" label="Описание" span><textarea id="p-desc" rows={4} className="input" {...register("description")} /></F>
      </div>

      <div className="card grid gap-4 p-4 sm:p-5 sm:grid-cols-3">
        <F id="p-price" label="Цена продажи, сом. *" error={errors.price?.message}><input id="p-price" inputMode="decimal" className="input" {...register("price")} /></F>
        <F id="p-old" label="Старая цена (для скидки)" error={errors.old_price?.message} hint="Покажет зачёркнутую цену"><input id="p-old" inputMode="decimal" className="input" {...register("old_price")} /></F>
        <F id="p-cost" label="Закупочная цена, сом." error={errors.cost?.message} hint="Себестоимость единицы. Приход товара пересчитывает её автоматически (средневзвешенно)"><input id="p-cost" inputMode="decimal" className="input" {...register("cost")} /></F>
        <F id="p-unit" label="Единица *"><select id="p-unit" className="input" {...register("unit")}>{unit.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></F>
        <F id="p-step" label="Шаг количества *" error={errors.step?.message} hint="Например, 0.5 кг или 1 шт."><input id="p-step" inputMode="decimal" className="input" {...register("step")} /></F>
        <F id="p-min" label="Минимальный остаток" error={errors.min_stock?.message} hint="Ниже этого значения — уведомление о низком остатке"><input id="p-min" inputMode="decimal" className="input" {...register("min_stock")} /></F>
      </div>

      <div className="card flex flex-wrap gap-x-8 gap-y-3 p-5 text-sm font-medium">
        {[["is_active", "Показывать на сайте"], ["is_featured", "Рекомендуемый"], ["is_new", "Новинка"], ["is_seasonal", "Сезонный"]].map(([n, l]) => (
          <label key={n} className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" {...register(n)} /> {l}</label>
        ))}
      </div>

      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-tint text-heading" : "bg-rose-50 text-rose-700"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Сохраняем…" : product ? "Сохранить" : "Создать товар"}</button>
        {product && <button type="button" className="btn-outline !border-rose-300 !text-rose-600" disabled={pending} onClick={onDelete}><Trash2 size={16} /> Удалить</button>}
      </div>
    </form>
  );
}
