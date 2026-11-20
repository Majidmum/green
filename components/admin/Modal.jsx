"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-ink/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`card my-6 w-full ${wide ? "max-w-3xl" : "max-w-xl"} p-6 outline-none`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-brand-dark">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-2 hover:bg-brand-light"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
