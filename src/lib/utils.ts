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

/**
 * Returns the start and end of the logical shift day for a given date.
 * A logical day starts at 06:00 AM and ends at 05:59 AM the next day.
 */
export function getShiftInterval(date: Date = new Date()) {
  const logicalDateStr = getShiftDate(date);
  const [year, month, day] = logicalDateStr.split('-').map(Number);
  
  // Start is 06:00:00 of the logical date
  const start = new Date(year, month - 1, day, 6, 0, 0);
  
  // End is 05:59:59 of the next calendar day from start
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(5, 59, 59, 999);
  
  return { start, end };
}

/**
 * Formats a timestamp/date to its logical business day display.
 * If 04/05 01:16, returns "03/05/2026 01:16"
 */
export function formatShiftDateTime(date: Date | any): string {
  if (!date) return 'Data inválida';
  const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
  
  const logicalShift = new Date(d);
  if (d.getHours() < 6) {
    logicalShift.setDate(logicalShift.getDate() - 1);
  }
  
  const day = String(logicalShift.getDate()).padStart(2, '0');
  const month = String(logicalShift.getMonth() + 1).padStart(2, '0');
  const year = logicalShift.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
