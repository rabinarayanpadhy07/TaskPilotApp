import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** "Ada Lovelace" -> "AL", "ada" -> "A" */
export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" })
const relativeTimeUnits = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

/** "2024-01-01T10:00:00Z" -> "5 min. ago", "yesterday", ... */
export function formatRelativeTime(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  for (const [unit, unitSeconds] of relativeTimeUnits) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTimeFormat.format(Math.round(seconds / unitSeconds), unit)
    }
  }
  return "just now"
}
