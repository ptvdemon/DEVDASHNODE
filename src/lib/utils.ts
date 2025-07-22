import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an ISO date string to "YYYY-MM-DD" format using UTC.
 * This is safe for SSR and avoids hydration errors.
 * @param dateString The ISO date string to format.
 * @returns The formatted date string or "N/A".
 */
export function formatUtcDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    // Use UTC methods to avoid timezone inconsistencies between server and client.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return 'Invalid Date';
  }
}
