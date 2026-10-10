const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local Date -> "YYYY-MM-DD" */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" -> local Date at midnight */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local Date -> "HH:MM" */
export function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "HH:MM" -> Date today at that time (for feeding pickers) */
export function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** "18:00" -> "6:00 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Saturday, October 10" */
export function formatDateLong(ymd: string): string {
  const d = parseYmd(ymd);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Sat, Oct 10" */
export function formatDateShort(ymd: string): string {
  const d = parseYmd(ymd);
  return `${DAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "October 10" */
export function formatMonthDay(ymd: string): string {
  const d = parseYmd(ymd);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Relative day label: "Today", "Tomorrow", or "Sat, Oct 10" */
export function friendlyDay(ymd: string): string {
  const today = toYmd(new Date());
  const tomorrow = toYmd(new Date(Date.now() + 86_400_000));
  if (ymd === today) return 'Today';
  if (ymd === tomorrow) return 'Tomorrow';
  return formatDateShort(ymd);
}

/** ISO timestamp -> "Oct 4, 6:12 PM" */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${formatTime(toHHMM(d))}`;
}

/** ISO timestamp -> "just now" / "5 min ago" / "3 h ago" / "Oct 4, 6:12 PM" */
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return formatTimestamp(iso);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** True if the request's date is already in the past. */
export function isPastDate(ymd: string): boolean {
  return ymd < toYmd(new Date());
}
