"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveSetting } from "@/app/admin/settings/actions";

function Section({ title, hint, children }) {
  return (
    <section className="card space-y-4 p-5">
      <div><h2 className="font-display text-lg font-bold text-brand-dark">{title}</h2>{hint && <p className="mt-0.5 text-xs text-brand-ink/60">{hint}</p>}</div>
      {children}
    </section>
  );
}

function SaveBar({ onSave, pending, msg }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary !py-2.5" disabled={pending} onClick={onSave}>{pending ? "Сохраняем…" : "Сохранить"}</button>
      {msg && <span className={`text-sm ${msg.ok ? "text-brand-dark" : "text-rose-600"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</span>}
    </div>
  );
}

function useSaver(key, getValue) {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    setMsg(null);
    const r = await saveSetting(key, getValue());
    setMsg(r.ok ? { ok: true, text: "Сохранено" } : { ok: false, text: r.error });
  });
  return { msg, pending, save };
}

const INFO = [["name", "Название"], ["phone", "Телефон"], ["whatsapp", "WhatsApp"], ["telegram", "Telegram"], ["email", "Email"], ["address", "Адрес"], ["working_hours", "Часы работы"], ["city", "Город"]];

function StoreInfo({ initial }) {
  const [v, setV] = useState({ name: "", phone: "", whatsapp: "", telegram: "", email: "", address: "", working_hours: "", city: "", ...initial });
  const { msg, pending, save } = useSaver("store_info", () => v);
  return (
    <Section title="Контакты магазина" hint="Показываются в шапке, футере и на странице «Контакты».">
      <div className="grid gap-4 sm:grid-cols-2">
        {INFO.map(([k, l]) => (
          <div key={k}><label htmlFor={`si-${k}`} className="mb-1.5 block text-sm font-medium">{l}</label><input id={`si-${k}`} className="input" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
        ))}
      </div>
      <SaveBar onSave={save} pending={pending} msg={msg} />
    </Section>
  );
}

function Slots({ initial }) {
  const [list, setList] = useState(initial.length ? initial : ["09:00–12:00"]);
  const { msg, pending, save } = useSaver("time_slots", () => list.map((x) => x.trim()).filter(Boolean));
  return (
    <Section title="Интервалы доставки" hint="Клиент выбирает интервал при оформлении заказа. Формат: 09:00–12:00.">
      <div className="space-y-2">
        {list.map((x, i) => (
          <div key={i} className="flex gap-2">
            <input className="input max-w-xs" value={x} onChange={(e) => setList(list.map((y, j) => (j === i ? e.target.value : y)))} aria-label={`Интервал ${i + 1}`} />
            <button type="button" className="rounded-full p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30" disabled={list.length === 1} aria-label="Удалить интервал" onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn-outline !py-2" onClick={() => setList([...list, ""])}><Plus size={15} /> Добавить интервал</button>
      </div>
      <SaveBar onSave={save} pending={pending} msg={msg} />
    </Section>
  );
}

function Legal({ slug, initial, label }) {
  const [v, setV] = useState({ title: initial?.title ?? label, body: initial?.body ?? "" });
  const { msg, pending, save } = useSaver(`page:${slug}`, () => v);
  const placeholder = /\[[А-ЯЁ ]*(ЗАПОЛНИТЬ|ТЕКСТ|УСЛОВИЯ)/i.test(v.body);
  return (
    <Section title={label} hint={`Страница /${slug}. Абзацы разделяйте пустой строкой.`}>
      {placeholder && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">В тексте остались заглушки в квадратных скобках — замените их реальными реквизитами и условиями, согласованными с юристом.</p>}
      <div><label htmlFor={`lg-${slug}-t`} className="mb-1.5 block text-sm font-medium">Заголовок</label><input id={`lg-${slug}-t`} className="input" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
      <div><label htmlFor={`lg-${slug}-b`} className="mb-1.5 block text-sm font-medium">Текст</label><textarea id={`lg-${slug}-b`} rows={10} className="input font-mono text-[13px]" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></div>
      <SaveBar onSave={save} pending={pending} msg={msg} />
    </Section>
  );
}

export default function SettingsEditor({ storeInfo, slots, pages }) {
  return (
    <div className="max-w-3xl space-y-5">
      <StoreInfo initial={storeInfo} />
      <Slots initial={slots} />
      <Legal slug="offer" label="Публичная оферта" initial={pages.offer} />
      <Legal slug="privacy-policy" label="Политика конфиденциальности" initial={pages["privacy-policy"]} />
      <Legal slug="terms" label="Условия использования" initial={pages.terms} />
      <Legal slug="delivery" label="Условия доставки и оплаты" initial={pages.delivery} />
    </div>
  );
}
