import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the effective business date (Expediente).
 * If the current time is between 00:00 and 05:59, it returns the previous day's date string.
 * Otherwise, it returns today's date string.
 * Format: YYYY-MM-DD
 */
export function getShiftDate(dateObj: Date = new Date()): string {
  const d = new Date(dateObj);
  const hour = d.getHours();
  // If before 6 AM, it belongs to the previous business day
  if (hour < 6) {
    d.setDate(d.getDate() - 1);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
