import { UNITS } from "@/lib/constants";

export function formatMoney(value) {
  const n = Number(value ?? 0);
  return (
    new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + " сом."
  );
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dushanbe",
  }).format(new Date(value));
}

export function formatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeZone: "Asia/Dushanbe",
  }).format(new Date(value));
}

export function unitLabel(unit) {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export function formatQty(qty, unit) {
  const n = Math.round(Number(qty) * 1000) / 1000;
  return `${n.toLocaleString("ru-RU")} ${unitLabel(unit)}`;
}

export function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

// plural(5, ["товар", "товара", "товаров"]) → "товаров"
export function plural(n, forms) {
  const a = Math.abs(Number(n)) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
