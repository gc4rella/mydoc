import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayColumn } from "@/components/calendario/day-column";
import type { DoctorSlot } from "@/db/schema";

function createSlot(start: Date, end: Date, durationMinutes: number): DoctorSlot {
  return {
    id: `slot-${start.getTime()}`,
    startTime: start,
    endTime: end,
    durationMinutes,
    isAvailable: true,
    note: null,
    createdAt: new Date(),
  };
}

describe("DayColumn", () => {
  it("creates a single-slot draft snapped to 15 minutes when clicking an empty time cell", () => {
    const date = new Date(2099, 0, 15);
    const onTimeClick = vi.fn();

    const { container } = render(
      <DayColumn
        date={date}
        slots={[]}
        appointments={new Map()}
        onTimeClick={onTimeClick}
        showHeader={false}
        startHour={8}
        endHour={10}
      />
    );

    const grid = container.querySelector("[data-calendar-grid='true']") as HTMLDivElement;
    expect(grid).toBeTruthy();

    Object.defineProperty(grid, "getBoundingClientRect", {
      value: () => ({
        top: 0,
        left: 0,
        width: 100,
        height: 240,
        right: 100,
        bottom: 240,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.click(grid, { clientY: 35 });

    expect(onTimeClick).toHaveBeenCalledTimes(1);
    const [clickedDate, startMinutes, endMinutes] = onTimeClick.mock.calls[0] as [
      Date,
      number,
      number,
    ];

    expect(clickedDate.getFullYear()).toBe(2099);
    expect(clickedDate.getMonth()).toBe(0);
    expect(clickedDate.getDate()).toBe(15);
    expect(startMinutes).toBe(495);
    expect(endMinutes).toBe(510);
  });

  it("creates a range draft when dragging on the calendar", () => {
    const date = new Date(2099, 0, 15);
    const onCreateRange = vi.fn();

    const { container } = render(
      <DayColumn
        date={date}
        slots={[]}
        appointments={new Map()}
        onCreateRange={onCreateRange}
        showHeader={false}
        startHour={8}
        endHour={10}
      />
    );

    const grid = container.querySelector("[data-calendar-grid='true']") as HTMLDivElement;
    expect(grid).toBeTruthy();

    Object.defineProperty(grid, "getBoundingClientRect", {
      value: () => ({
        top: 0,
        left: 0,
        width: 100,
        height: 240,
        right: 100,
        bottom: 240,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(grid, { button: 0, clientY: 35, pointerId: 1 });
    fireEvent.pointerMove(grid, { clientY: 95, pointerId: 1 });
    fireEvent.pointerUp(grid, { pointerId: 1 });

    expect(onCreateRange).toHaveBeenCalledTimes(1);
    const [clickedDate, startMinutes, endMinutes] = onCreateRange.mock.calls[0] as [
      Date,
      number,
      number,
    ];
    expect(clickedDate.getDate()).toBe(15);
    expect(startMinutes).toBe(495);
    expect(endMinutes).toBe(525);
  });

  it("hides secondary text on compact 15-minute slot cards to avoid text overflow", () => {
    const date = new Date(2099, 0, 15);
    const slot = createSlot(new Date(2099, 0, 15, 8, 0), new Date(2099, 0, 15, 8, 15), 15);

    render(
      <DayColumn
        date={date}
        slots={[slot]}
        appointments={new Map()}
        showHeader={false}
        startHour={8}
        endHour={9}
      />
    );

    expect(screen.getByText(/08:00/)).toBeTruthy();
    expect(screen.queryByText("15 min")).toBeNull();
  });
});
