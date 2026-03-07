/**
 * Returns today's date in YYYY-MM-DD format using the user's local timezone.
 * Use this for habit logs so "today" resets at midnight local time.
 */
export function getLocalDateString(d?: Date): string {
  const date = d ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
