// Периоды отчётов. Все даты — по времени Душанбе (UTC+5, без перехода на летнее время).
const DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function dushanbeToday(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dushanbe" }).format(now);
}
const shift = (iso, days) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);
const monthStart = (iso) => `${iso.slice(0, 8)}01`;
const monthEnd = (iso) => { const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return shift(d.toISOString().slice(0, 10), -1); };

export const PRESETS = [
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "month", label: "Этот месяц" },
  { key: "prev_month", label: "Прошлый месяц" },
  { key: "90d", label: "90 дней" },
  { key: "year", label: "С начала года" },
];

export function presetRange(key, today = dushanbeToday()) {
  switch (key) {
    case "today": return [today, today];
    case "yesterday": return [shift(today, -1), shift(today, -1)];
    case "7d": return [shift(today, -6), today];
    case "90d": return [shift(today, -89), today];
    case "month": return [monthStart(today), today];
    case "prev_month": { const prevEnd = shift(monthStart(today), -1); return [monthStart(prevEnd), prevEnd]; }
    case "year": return [`${today.slice(0, 4)}-01-01`, today];
    case "30d": default: return [shift(today, -29), today];
  }
}

// Разбор параметров адреса ?preset=…&from=…&to=…; некорректное → 30 дней
export function parsePeriod(sp = {}, fallback = "30d") {
  const today = dushanbeToday();
  if (DATE.test(sp.from ?? "") && DATE.test(sp.to ?? "") && sp.from <= sp.to) {
    const days = (new Date(sp.to) - new Date(sp.from)) / DAY;
    if (days <= 799) return { from: sp.from, to: sp.to, preset: "custom" };
  }
  const key = PRESETS.some((p) => p.key === sp.preset) ? sp.preset : fallback;
  const [from, to] = presetRange(key, today);
  return { from, to, preset: key };
}

// Предыдущий период такой же длины — для сравнения «было / стало»
export function previousPeriod({ from, to }) {
  const days = Math.round((new Date(to) - new Date(from)) / DAY) + 1;
  return { from: shift(from, -days), to: shift(from, -1) };
}
