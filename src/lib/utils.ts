import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compactDate(date: Date | string | null | undefined) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function truncateText(value: string, max = 180) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}
