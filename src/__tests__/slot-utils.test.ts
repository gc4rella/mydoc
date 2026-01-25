import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  generateSlotRanges,
  isSameDay,
  formatDateLocal,
} from "../lib/slot-utils";

describe("parseLocalDate", () => {
  it("should parse a date string with hours correctly", () => {
    const date = parseLocalDate("2026-01-27", 9, 0);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0); // January is 0
    expect(date.getDate()).toBe(27);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });

  it("should handle different hours and minutes", () => {
    const date = parseLocalDate("2026-03-15", 14, 30);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March is 2
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });

  it("should create the correct date regardless of timezone", () => {
    // This is the key test - the date should always be the same calendar day
    const dateStr = "2026-01-27";
    const date = parseLocalDate(dateStr, 9, 0);

    // The formatted date should match the input
    expect(formatDateLocal(date)).toBe(dateStr);
  });
});

describe("generateSlotRanges", () => {
  it("should generate correct number of 30-min slots for 4-hour block", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 13, 0, 30);

    // 4 hours = 240 minutes, 240 / 30 = 8 slots
    expect(slots.length).toBe(8);
  });

  it("should generate correct number of 15-min slots", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 10, 0, 15);

    // 1 hour = 60 minutes, 60 / 15 = 4 slots
    expect(slots.length).toBe(4);
  });

  it("should generate correct number of 60-min slots", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 13, 0, 60);

    // 4 hours = 4 slots
    expect(slots.length).toBe(4);
  });

  it("should have slots on the correct date", () => {
    const dateStr = "2026-01-27";
    const slots = generateSlotRanges(dateStr, 9, 0, 13, 0, 30);

    // All slots should be on January 27
    for (const slot of slots) {
      expect(slot.startTime.getDate()).toBe(27);
      expect(slot.startTime.getMonth()).toBe(0); // January
      expect(slot.startTime.getFullYear()).toBe(2026);
      expect(formatDateLocal(slot.startTime)).toBe(dateStr);
    }
  });

  it("should have correct start times", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 11, 0, 30);

    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].startTime.getMinutes()).toBe(0);

    expect(slots[1].startTime.getHours()).toBe(9);
    expect(slots[1].startTime.getMinutes()).toBe(30);

    expect(slots[2].startTime.getHours()).toBe(10);
    expect(slots[2].startTime.getMinutes()).toBe(0);

    expect(slots[3].startTime.getHours()).toBe(10);
    expect(slots[3].startTime.getMinutes()).toBe(30);
  });

  it("should have correct end times", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 10, 0, 30);

    expect(slots[0].endTime.getHours()).toBe(9);
    expect(slots[0].endTime.getMinutes()).toBe(30);

    expect(slots[1].endTime.getHours()).toBe(10);
    expect(slots[1].endTime.getMinutes()).toBe(0);
  });

  it("should return empty array if end time is before start time", () => {
    const slots = generateSlotRanges("2026-01-27", 13, 0, 9, 0, 30);
    expect(slots.length).toBe(0);
  });

  it("should return empty array if block is too short for even one slot", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 0, 9, 15, 30);
    expect(slots.length).toBe(0);
  });

  it("should handle non-zero start minutes", () => {
    const slots = generateSlotRanges("2026-01-27", 9, 30, 11, 0, 30);

    expect(slots.length).toBe(3);
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].startTime.getMinutes()).toBe(30);
  });

  it("should handle afternoon slots (14:00-18:00)", () => {
    const dateStr = "2026-01-27";
    const slots = generateSlotRanges(dateStr, 14, 0, 18, 0, 30);

    expect(slots.length).toBe(8);

    // First slot
    expect(slots[0].startTime.getHours()).toBe(14);
    expect(formatDateLocal(slots[0].startTime)).toBe(dateStr);

    // Last slot
    expect(slots[7].startTime.getHours()).toBe(17);
    expect(slots[7].startTime.getMinutes()).toBe(30);
    expect(formatDateLocal(slots[7].startTime)).toBe(dateStr);
  });
});

describe("isSameDay", () => {
  it("should return true for same day", () => {
    const date1 = new Date(2026, 0, 27, 9, 0);
    const date2 = new Date(2026, 0, 27, 17, 30);
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it("should return false for different days", () => {
    const date1 = new Date(2026, 0, 27, 23, 59);
    const date2 = new Date(2026, 0, 28, 0, 0);
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it("should return false for different months", () => {
    const date1 = new Date(2026, 0, 27);
    const date2 = new Date(2026, 1, 27);
    expect(isSameDay(date1, date2)).toBe(false);
  });
});

describe("formatDateLocal", () => {
  it("should format date as YYYY-MM-DD", () => {
    const date = new Date(2026, 0, 27, 9, 0);
    expect(formatDateLocal(date)).toBe("2026-01-27");
  });

  it("should pad single digit months and days", () => {
    const date = new Date(2026, 2, 5, 9, 0); // March 5
    expect(formatDateLocal(date)).toBe("2026-03-05");
  });
});
