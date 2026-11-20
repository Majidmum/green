"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "gg-theme";

// Переключатель светлой/тёмной темы. Выбор хранится в localStorage; без выбора берётся тема системы.
// Начальный класс ставит inline-скрипт в <head> (см. app/layout.jsx), поэтому мерцания нет.
export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch {}
    setDark(!dark);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={dark ? "Светлая тема" : "Тёмная тема"}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
