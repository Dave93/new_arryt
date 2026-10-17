/**
 * Текст ошибки из ответа Eden. Eden не бросает исключение на 4xx/5xx — он
 * возвращает `{ error }`, поэтому без проверки форма показывала «успешно»,
 * хотя сервер ничего не сохранил.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const value = (error as { value?: unknown } | null | undefined)?.value;
  if (typeof value === "string" && value.trim()) return value;
  const message = (value as { message?: unknown } | null | undefined)?.message;
  if (typeof message === "string" && message.trim()) return message;
  // Ошибка валидации Elysia: { summary: "Expected property 'data.x' ..." }
  const summary = (value as { summary?: unknown } | null | undefined)?.summary;
  if (typeof summary === "string" && summary.trim()) return `${fallback}: ${summary}`;
  return fallback;
}
