"use client";

// Последний рубеж: ошибка в корневом layout. Стили Tailwind здесь недоступны.
export default function GlobalError({ reset }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FAF8F2", color: "#17231B", textAlign: "center", padding: "20vh 1rem" }}>
        <h1 style={{ fontSize: "2rem", color: "#123D2A" }}>Что-то пошло не так</h1>
        <p>Попробуйте обновить страницу.</p>
        <button onClick={() => reset()} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#00A651", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
          Обновить
        </button>
      </body>
    </html>
  );
}
