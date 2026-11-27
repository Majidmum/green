"use client";

import { useEffect } from "react";

// Ставит data-label на ячейки таблиц .rt по заголовкам колонок: на телефоне строки показываются карточками.
export default function ResponsiveTables() {
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      document.querySelectorAll("table.rt").forEach((t) => {
        const labels = [...t.querySelectorAll("thead th")].map((th) => th.textContent.trim());
        t.querySelectorAll("tbody tr").forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (td.hasAttribute("colspan")) return;
            const l = labels[i] ?? "";
            if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
          });
        });
      });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
    apply();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
