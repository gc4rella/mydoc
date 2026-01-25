/**
 * Utility functions for slot date/time handling.
 * Extracted for testability.
 */

export interface SlotTimeRange {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

/**
 * Parse a date string (YYYY-MM-DD) and time components into a local Date.
 * This avoids timezone issues that occur when parsing date-only strings.
 */
export function parseLocalDate(
  dateStr: string,
  hours: number,
  minutes: number = 0
): Date {
  // Parse the date string components manually to avoid timezone issues
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date;
}

/**
 * Generate slot time ranges for a given date and time block.
 */
export function generateSlotRanges(
  dateStr: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  slotDurationMinutes: number
): SlotTimeRange[] {
  const blockStart = parseLocalDate(dateStr, startHour, startMinute);
  const blockEnd = parseLocalDate(dateStr, endHour, endMinute);

  if (blockEnd <= blockStart) {
    return [];
  }

  const slots: SlotTimeRange[] = [];
  let currentStart = new Date(blockStart);

  while (currentStart < blockEnd) {
    const currentEnd = new Date(currentStart.getTime() + slotDurationMinutes * 60 * 1000);
    if (currentEnd > blockEnd) break;

    slots.push({
      startTime: new Date(currentStart),
      endTime: new Date(currentEnd),
      durationMinutes: slotDurationMinutes,
    });

    currentStart = currentEnd;
  }

  return slots;
}

/**
 * Check if a date is the same calendar day as another date (in local time).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format a date as YYYY-MM-DD in local time.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
