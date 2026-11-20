// Разрешает только внутренние пути вида "/something". Защита от open redirect
// (//evil.com, /\evil.com, https://evil.com, javascript: и т. п.).
export function safeNext(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
