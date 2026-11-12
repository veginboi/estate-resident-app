import type { ChatMessage } from "@/lib/types";

export const THREAD_POLL_MS = 4000;
export const LIST_POLL_MS = 10000;

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const yesterday = () => new Date(Date.now() - 86_400_000);

export function clock(d: Date) {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "6:45pm" today, "Yesterday", or "12 Nov" for the chat list. */
export function formatListTime(iso: string) {
  const d = new Date(iso);
  if (sameDay(d, new Date())) return clock(d);
  if (sameDay(d, yesterday())) return "Yesterday";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayLabel(d: Date) {
  if (sameDay(d, new Date())) return "Today";
  if (sameDay(d, yesterday())) return "Yesterday";
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const seen = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
};
