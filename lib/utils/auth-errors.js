// Переводит технические ошибки Supabase Auth в понятные сообщения.
export function translateAuthError(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Неверный email или пароль";
  if (msg.includes("email not confirmed")) return "Подтвердите email по ссылке из письма и войдите снова";
  if (msg.includes("user already registered")) return "Этот email уже зарегистрирован";
  if (msg.includes("password should be at least")) return "Пароль слишком короткий (минимум 8 символов)";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Слишком много попыток. Подождите немного и повторите";
  if (msg.includes("banned") || msg.includes("user is banned")) return "Аккаунт заблокирован. Свяжитесь с магазином";
  if (msg.includes("same password")) return "Новый пароль должен отличаться от старого";
  if (msg.includes("fetch") || msg.includes("network")) return "Нет связи с сервером. Проверьте интернет";
  return "Не удалось выполнить действие. Попробуйте ещё раз";
}
